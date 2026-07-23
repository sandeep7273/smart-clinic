/**
 * AI Service GraphQL Proxy
 * Proxies GraphQL queries/mutations to ai-service
 */

const { wrapSchema } = require("@graphql-tools/wrap");
const { print, buildClientSchema, getIntrospectionQuery } = require("graphql");
const fetch = require("cross-fetch");
const dns = require("dns");
const {
  DiscoverInstancesCommand,
  ServiceDiscoveryClient,
} = require("@aws-sdk/client-servicediscovery");
const logger = require("../utils/logger");
const config = require("../config");

const AI_PROXY_TIMEOUT_MS = parseInt(
  process.env.AI_PROXY_TIMEOUT_MS || "30000",
  10,
);
const serviceDiscoveryClient = new ServiceDiscoveryClient({});

function isAbortError(error) {
  return (
    /aborted|abort/i.test(error.name || "") ||
    /aborted/i.test(error.message || "")
  );
}

function isRetryableNetworkError(error) {
  return /aborted|timeout|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH/i.test(
    error.message || "",
  );
}

async function resolveIpv4ServiceUrl(serviceUrl) {
  const parsedUrl = new URL(serviceUrl);
  let addresses = [];

  try {
    addresses = await dns.promises.resolve4(parsedUrl.hostname);
  } catch (error) {
    logger.warn("AI service DNS IPv4 resolution failed, trying Cloud Map", {
      serviceUrl,
      hostname: parsedUrl.hostname,
      error: error.message,
    });
  }

  if (addresses.length) {
    parsedUrl.hostname = addresses[0];
    return parsedUrl.toString().replace(/\/$/, "");
  }

  const parts = parsedUrl.hostname.split(".");
  if (parts.length < 3) {
    throw new Error(`No IPv4 address found for ${parsedUrl.hostname}`);
  }

  const serviceName = parts[0];
  const namespaceName = parts.slice(1).join(".");
  const response = await serviceDiscoveryClient.send(
    new DiscoverInstancesCommand({
      NamespaceName: namespaceName,
      ServiceName: serviceName,
    }),
  );
  const instance = response.Instances?.find(
    (candidate) => candidate.Attributes?.AWS_INSTANCE_IPV4,
  );
  const address = instance?.Attributes?.AWS_INSTANCE_IPV4;

  if (!address) {
    throw new Error(
      `No Cloud Map IPv4 instance found for ${parsedUrl.hostname}`,
    );
  }

  parsedUrl.hostname = address;
  return parsedUrl.toString().replace(/\/$/, "");
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function executeAIServiceRequest(
  serviceUrl,
  requestOptions,
  correlationId,
) {
  try {
    return await fetchJsonWithTimeout(
      serviceUrl,
      requestOptions,
      AI_PROXY_TIMEOUT_MS,
    );
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (!isRetryableNetworkError(error)) {
      throw error;
    }

    logger.warn("AI service request failed, retrying via IPv4 target", {
      correlationId,
      serviceUrl,
      error: error.message,
    });

    const fallbackUrl = await resolveIpv4ServiceUrl(serviceUrl);
    const originalHost = new URL(serviceUrl).host;
    return fetchJsonWithTimeout(
      fallbackUrl,
      {
        ...requestOptions,
        headers: {
          ...requestOptions.headers,
          Host: originalHost,
        },
      },
      AI_PROXY_TIMEOUT_MS,
    );
  }
}

/**
 * Create executor for AI service GraphQL endpoint
 */
const createAIServiceExecutor = () => {
  const serviceUrl = `${config.services.ai}/graphql`;

  return async ({ document, variables, context }) => {
    const query = print(document);

    try {
      const headers = {
        "Content-Type": "application/json",
        "x-correlation-id": context.correlationId || "unknown",
      };

      // Forward authentication token if available
      if (context.token) {
        headers["Authorization"] = `Bearer ${context.token}`;
      }

      // Forward user context headers
      if (context.user) {
        headers["x-user-id"] = context.user.userId || context.user.id;
        headers["x-user-email"] = context.user.email;
        headers["x-user-role"] = context.user.role;
        if (context.user.tenantId) {
          headers["x-tenant-id"] = context.user.tenantId;
        }
      }

      logger.debug("Executing GraphQL query on ai-service", {
        correlationId: context.correlationId,
        operationName: document.definitions[0]?.name?.value,
        hasAuth: !!context.token,
      });

      const result = await executeAIServiceRequest(
        serviceUrl,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            query,
            variables,
            operationName: document.definitions[0]?.name?.value,
          }),
        },
        context.correlationId,
      );

      if (result.errors) {
        logger.error("AI service GraphQL errors", {
          correlationId: context.correlationId,
          errors: result.errors,
        });
      }

      return result;
    } catch (error) {
      logger.error("Failed to execute GraphQL query on ai-service", {
        correlationId: context.correlationId,
        error: error.message,
        stack: error.stack,
      });

      throw new Error(`AI service unavailable: ${error.message}`);
    }
  };
};

/**
 * Create wrapped schema for AI service
 */
const createAIServiceSchema = async () => {
  try {
    const executor = createAIServiceExecutor();
    const serviceUrl = `${config.services.ai}/graphql`;

    logger.info("Introspecting ai-service GraphQL schema...");

    // Manually introspect the schema
    const introspectionQuery = getIntrospectionQuery();
    const responseData = await executeAIServiceRequest(
      serviceUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: introspectionQuery }),
      },
      "schema-introspection",
    );

    if (!responseData || !responseData.data) {
      throw new Error(
        `Invalid introspection response: ${JSON.stringify(responseData)}`,
      );
    }

    const schema = buildClientSchema(responseData.data);

    logger.info("✅ AI service schema introspected successfully");

    // Wrap the schema with the executor
    const wrappedSchema = wrapSchema({
      schema,
      executor,
    });

    return wrappedSchema;
  } catch (error) {
    logger.error("Failed to create AI service schema", {
      error: error.message,
      stack: error.stack,
    });

    return null;
  }
};

/**
 * Check if AI service is available
 */
const checkAIServiceAvailability = async () => {
  try {
    const serviceUrl = `${config.services.ai}/health`;

    logger.info(`Checking AI service availability at ${serviceUrl}...`);

    const response = await fetch(serviceUrl, {
      method: "GET",
      timeout: 5000, // 5 second timeout
    });

    if (!response.ok) {
      logger.warn(`AI service health check failed: ${response.status}`);
      return false;
    }

    const data = await response.json();
    logger.info("✅ AI service is available", data);

    return true;
  } catch (error) {
    logger.warn(`AI service not available: ${error.message}`);
    return false;
  }
};

module.exports = {
  createAIServiceSchema,
  checkAIServiceAvailability,
};

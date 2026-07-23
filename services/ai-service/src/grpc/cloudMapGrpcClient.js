const dns = require("dns");
const net = require("net");
const grpc = require("@grpc/grpc-js");
const {
  DiscoverInstancesCommand,
  ServiceDiscoveryClient,
} = require("@aws-sdk/client-servicediscovery");

const serviceDiscoveryClient = new ServiceDiscoveryClient({});
const GRPC_CALL_TIMEOUT_MS = parseInt(
  process.env.GRPC_CALL_TIMEOUT_MS || "8000",
  10,
);

function parseTarget(target) {
  const normalized = target
    .replace(/^dns:\/\//, "")
    .replace(/^dns:/, "")
    .replace(/^\/\//, "");
  const separatorIndex = normalized.lastIndexOf(":");

  if (separatorIndex === -1) {
    return { host: normalized, port: "50051" };
  }

  return {
    host: normalized.slice(0, separatorIndex),
    port: normalized.slice(separatorIndex + 1),
  };
}

function getResolutionHosts(host) {
  const hosts = [host];

  if (host.includes("-grpc.")) {
    hosts.push(host.replace("-grpc.", "."));
  }

  return [...new Set(hosts)];
}

function parseCloudMapHost(host) {
  const parts = host.split(".");

  if (parts.length < 3) {
    return null;
  }

  return {
    serviceName: parts[0],
    namespaceName: parts.slice(1).join("."),
  };
}

async function discoverCloudMapTarget(target, logger, logPrefix) {
  const { host, port } = parseTarget(target);
  const cloudMapHost = parseCloudMapHost(host);

  if (!cloudMapHost) {
    throw new Error(`Target ${target} is not a Cloud Map service name`);
  }

  const response = await serviceDiscoveryClient.send(
    new DiscoverInstancesCommand({
      NamespaceName: cloudMapHost.namespaceName,
      ServiceName: cloudMapHost.serviceName,
    }),
  );

  const instance = response.Instances?.find(
    (candidate) => candidate.Attributes?.AWS_INSTANCE_IPV4,
  );
  const address = instance?.Attributes?.AWS_INSTANCE_IPV4;
  const discoveredPort = instance?.Attributes?.AWS_INSTANCE_PORT || port;

  if (!address) {
    throw new Error(`No IPv4 Cloud Map instance found for ${host}`);
  }

  logger.info(`${logPrefix}: Resolved Cloud Map fallback target`, {
    configuredTarget: target,
    namespaceName: cloudMapHost.namespaceName,
    serviceName: cloudMapHost.serviceName,
    address,
    port: discoveredPort,
  });

  return `${address}:${discoveredPort}`;
}

async function resolveIpv4Target(target, logger, logPrefix) {
  const { host, port } = parseTarget(target);

  if (net.isIPv4(host)) {
    return `${host}:${port}`;
  }

  for (const resolutionHost of getResolutionHosts(host)) {
    try {
      const addresses = await dns.promises.resolve4(resolutionHost);
      if (addresses.length > 0) {
        logger.info(`${logPrefix}: Resolved IPv4 fallback target`, {
          configuredTarget: target,
          resolutionHost,
          address: addresses[0],
          port,
        });
        return `${addresses[0]}:${port}`;
      }
    } catch (error) {
      logger.warn(`${logPrefix}: IPv4 resolution failed`, {
        configuredTarget: target,
        resolutionHost,
        error: error.message,
      });
    }
  }

  try {
    return await discoverCloudMapTarget(target, logger, logPrefix);
  } catch (error) {
    logger.warn(`${logPrefix}: Cloud Map discovery failed`, {
      configuredTarget: target,
      error: error.message,
    });
  }

  throw new Error(`Unable to resolve IPv4 address for ${target}`);
}

function isRetryableResolutionError(error) {
  return (
    error?.code === grpc.status.UNAVAILABLE &&
    /Name resolution failed|ENETUNREACH|EHOSTUNREACH|No connection established/i.test(
      error.message || "",
    )
  );
}

function createCloudMapGrpcClient({
  configuredTarget,
  createClient,
  logger,
  logPrefix,
}) {
  let client = createClient(configuredTarget);
  let activeTarget = configuredTarget;
  let fallbackClientPromise;

  async function getFallbackClient({ forceRefresh = false } = {}) {
    if (forceRefresh) {
      fallbackClientPromise = undefined;
    }

    if (!fallbackClientPromise) {
      fallbackClientPromise = resolveIpv4Target(
        configuredTarget,
        logger,
        logPrefix,
      ).then((target) => {
        activeTarget = target;
        client = createClient(target);
        return client;
      });
    }

    return fallbackClientPromise;
  }

  function callGrpc(grpcClient, methodName, request) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const error = new Error(
          `${methodName} timed out after ${GRPC_CALL_TIMEOUT_MS}ms`,
        );
        error.code = grpc.status.UNAVAILABLE;
        reject(error);
      }, GRPC_CALL_TIMEOUT_MS);

      grpcClient[methodName].call(grpcClient, request, (error, response) => {
        clearTimeout(timeout);
        if (error) {
          logger.error(`${logPrefix}: gRPC call error`, {
            target: activeTarget,
            methodName,
            error: error.message,
            code: error.code,
          });
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  async function call(methodName, request) {
    try {
      return await callGrpc(client, methodName, request);
    } catch (error) {
      if (!isRetryableResolutionError(error)) {
        throw error;
      }

      logger.warn(`${logPrefix}: Retrying with IPv4 fallback target`, {
        methodName,
        configuredTarget,
        error: error.message,
      });

      const fallbackClient = await getFallbackClient();
      try {
        return await callGrpc(fallbackClient, methodName, request);
      } catch (fallbackError) {
        if (!isRetryableResolutionError(fallbackError)) {
          throw fallbackError;
        }

        logger.warn(
          `${logPrefix}: Refreshing fallback target after connection failure`,
          {
            methodName,
            staleTarget: activeTarget,
            error: fallbackError.message,
          },
        );

        const refreshedFallbackClient = await getFallbackClient({
          forceRefresh: true,
        });
        return callGrpc(refreshedFallbackClient, methodName, request);
      }
    }
  }

  return { call };
}

module.exports = {
  createCloudMapGrpcClient,
};

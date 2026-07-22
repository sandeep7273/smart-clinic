/**
 * gRPC Client for Doctor Service
 * Enables fast inter-service communication with doctor-service
 */

// Force IPv4 DNS resolution — ECS Service Connect DNS may return IPv6 first.
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const net = require("net");
const {
  DiscoverInstancesCommand,
  ServiceDiscoveryClient,
} = require("@aws-sdk/client-servicediscovery");
const logger = require("../utils/logger");
const config = require("../config");

// Load proto file
const PROTO_PATH = path.join(__dirname, "../../proto/doctor.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const doctorProto = grpc.loadPackageDefinition(packageDefinition).doctor;
const serviceDiscoveryClient = new ServiceDiscoveryClient({});

// Get gRPC server URL from config
const GRPC_SERVER_URL = config.doctorGrpcUrl;

function createClient(target) {
  return new doctorProto.DoctorService(
    target,
    grpc.credentials.createInsecure(),
  );
}

let client = createClient(GRPC_SERVER_URL);
let activeTarget = GRPC_SERVER_URL;
let fallbackClientPromise;

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

async function discoverCloudMapTarget(target) {
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

  logger.info("gRPC Client: Resolved Cloud Map fallback target", {
    configuredTarget: target,
    namespaceName: cloudMapHost.namespaceName,
    serviceName: cloudMapHost.serviceName,
    address,
    port: discoveredPort,
  });

  return `${address}:${discoveredPort}`;
}

async function resolveIpv4Target(target) {
  const { host, port } = parseTarget(target);

  if (net.isIPv4(host)) {
    return `${host}:${port}`;
  }

  for (const resolutionHost of getResolutionHosts(host)) {
    try {
      const addresses = await dns.promises.resolve4(resolutionHost);
      if (addresses.length > 0) {
        logger.info("gRPC Client: Resolved IPv4 fallback target", {
          configuredTarget: target,
          resolutionHost,
          address: addresses[0],
          port,
        });
        return `${addresses[0]}:${port}`;
      }
    } catch (error) {
      logger.warn("gRPC Client: IPv4 resolution failed", {
        configuredTarget: target,
        resolutionHost,
        error: error.message,
      });
    }
  }

  try {
    return await discoverCloudMapTarget(target);
  } catch (error) {
    logger.warn("gRPC Client: Cloud Map discovery failed", {
      configuredTarget: target,
      error: error.message,
    });
  }

  throw new Error(`Unable to resolve IPv4 address for ${target}`);
}

async function getFallbackClient({ forceRefresh = false } = {}) {
  if (forceRefresh) {
    fallbackClientPromise = undefined;
  }

  if (!fallbackClientPromise) {
    fallbackClientPromise = resolveIpv4Target(GRPC_SERVER_URL).then(
      (target) => {
        activeTarget = target;
        client = createClient(target);
        return client;
      },
    );
  }

  return fallbackClientPromise;
}

function isRetryableResolutionError(error) {
  return (
    error?.code === grpc.status.UNAVAILABLE &&
    /Name resolution failed|ENETUNREACH|EHOSTUNREACH|No connection established/i.test(
      error.message || "",
    )
  );
}

/**
 * Promisified gRPC call wrapper
 */
function callGrpc(grpcClient, methodName, request) {
  return new Promise((resolve, reject) => {
    grpcClient[methodName].call(grpcClient, request, (error, response) => {
      if (error) {
        logger.error("gRPC call error", {
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

async function promisifyGrpcCall(methodName, request) {
  try {
    return await callGrpc(client, methodName, request);
  } catch (error) {
    if (!isRetryableResolutionError(error)) {
      throw error;
    }

    logger.warn("gRPC Client: Retrying with IPv4 fallback target", {
      methodName,
      configuredTarget: GRPC_SERVER_URL,
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
        "gRPC Client: Refreshing fallback target after connection failure",
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

/**
 * Get doctor details by ID
 */
async function getDoctorDetails(doctorId, authToken = "") {
  try {
    logger.info("gRPC Client: Calling GetDoctorDetails", { doctorId });

    const response = await promisifyGrpcCall("GetDoctorDetails", {
      doctor_id: doctorId,
      auth_token: authToken,
    });

    if (!response.success) {
      throw new Error(response.message || "Failed to get doctor details");
    }

    return response;
  } catch (error) {
    logger.error("gRPC Client: GetDoctorDetails error", {
      doctorId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Check doctor availability
 */
async function checkAvailability(
  doctorId,
  date,
  startTime,
  endTime,
  authToken = "",
) {
  try {
    logger.info("gRPC Client: Calling CheckAvailability", {
      doctorId,
      date,
      startTime,
      endTime,
    });

    const response = await promisifyGrpcCall("CheckAvailability", {
      doctor_id: doctorId,
      date,
      start_time: startTime,
      end_time: endTime,
      auth_token: authToken,
    });

    return response;
  } catch (error) {
    logger.error("gRPC Client: CheckAvailability error", {
      doctorId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Reserve a slot
 */
async function reserveSlot(
  doctorId,
  slotId,
  patientId,
  authToken = "",
  slotData = {},
) {
  try {
    logger.info("gRPC Client: Calling ReserveSlot", {
      doctorId,
      slotId,
      patientId,
      date: slotData.date,
      startTime: slotData.startTime,
      endTime: slotData.endTime,
    });

    const response = await promisifyGrpcCall("ReserveSlot", {
      doctor_id: doctorId,
      slot_id: slotId || "",
      patient_id: patientId,
      auth_token: authToken,
      date: slotData.date || "",
      start_time: slotData.startTime || "",
      end_time: slotData.endTime || "",
      duration: slotData.duration || 30,
    });

    return response;
  } catch (error) {
    logger.error("gRPC Client: ReserveSlot error", {
      doctorId,
      slotId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Release a slot
 */
async function releaseSlot(doctorId, slotId, authToken = "") {
  try {
    logger.info("gRPC Client: Calling ReleaseSlot", {
      doctorId,
      slotId,
    });

    const response = await promisifyGrpcCall("ReleaseSlot", {
      doctor_id: doctorId,
      slot_id: slotId,
      auth_token: authToken,
    });

    return response;
  } catch (error) {
    logger.error("gRPC Client: ReleaseSlot error", {
      doctorId,
      slotId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Health check - verifies gRPC connection
 */
async function healthCheck() {
  return new Promise((resolve) => {
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 5);

    client.waitForReady(deadline, (error) => {
      if (error) {
        logger.warn("gRPC Client: Health check failed", {
          error: error.message,
        });
        resolve(false);
      } else {
        logger.info("gRPC Client: Connection healthy");
        resolve(true);
      }
    });
  });
}

module.exports = {
  getDoctorDetails,
  checkAvailability,
  reserveSlot,
  releaseSlot,
  healthCheck,
  client,
};

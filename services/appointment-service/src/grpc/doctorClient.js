/**
 * gRPC Client for Doctor Service
 * Enables fast inter-service communication with doctor-service
 */

// Force IPv4 DNS resolution — ECS Service Connect DNS may return IPv6 first.
require('dns').setDefaultResultOrder('ipv4first');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config');

// Load proto file
const PROTO_PATH = path.join(__dirname, '../../proto/doctor.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const doctorProto = grpc.loadPackageDefinition(packageDefinition).doctor;

// Get gRPC server URL from config
const GRPC_SERVER_URL = config.doctorGrpcUrl;

// Create gRPC client
const client = new doctorProto.DoctorService(
  GRPC_SERVER_URL,
  grpc.credentials.createInsecure()
);

/**
 * Promisified gRPC call wrapper
 */
function promisifyGrpcCall(method, request) {
  return new Promise((resolve, reject) => {
    method.call(client, request, (error, response) => {
      if (error) {
        logger.error('gRPC call error', {
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

/**
 * Get doctor details by ID
 */
async function getDoctorDetails(doctorId, authToken = '') {
  try {
    logger.info('gRPC Client: Calling GetDoctorDetails', { doctorId });

    const response = await promisifyGrpcCall(client.GetDoctorDetails, {
      doctor_id: doctorId,
      auth_token: authToken,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to get doctor details');
    }

    return response;
  } catch (error) {
    logger.error('gRPC Client: GetDoctorDetails error', {
      doctorId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Check doctor availability
 */
async function checkAvailability(doctorId, date, startTime, endTime, authToken = '') {
  try {
    logger.info('gRPC Client: Calling CheckAvailability', {
      doctorId,
      date,
      startTime,
      endTime,
    });

    const response = await promisifyGrpcCall(client.CheckAvailability, {
      doctor_id: doctorId,
      date,
      start_time: startTime,
      end_time: endTime,
      auth_token: authToken,
    });

    return response;
  } catch (error) {
    logger.error('gRPC Client: CheckAvailability error', {
      doctorId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Reserve a slot
 */
async function reserveSlot(doctorId, slotId, patientId, authToken = '', slotData = {}) {
  try {
    logger.info('gRPC Client: Calling ReserveSlot', {
      doctorId,
      slotId,
      patientId,
      date: slotData.date,
      startTime: slotData.startTime,
      endTime: slotData.endTime,
    });

    const response = await promisifyGrpcCall(client.ReserveSlot, {
      doctor_id: doctorId,
      slot_id: slotId || '',
      patient_id: patientId,
      auth_token: authToken,
      date: slotData.date || '',
      start_time: slotData.startTime || '',
      end_time: slotData.endTime || '',
      duration: slotData.duration || 30,
    });

    return response;
  } catch (error) {
    logger.error('gRPC Client: ReserveSlot error', {
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
async function releaseSlot(doctorId, slotId, authToken = '') {
  try {
    logger.info('gRPC Client: Calling ReleaseSlot', {
      doctorId,
      slotId,
    });

    const response = await promisifyGrpcCall(client.ReleaseSlot, {
      doctor_id: doctorId,
      slot_id: slotId,
      auth_token: authToken,
    });

    return response;
  } catch (error) {
    logger.error('gRPC Client: ReleaseSlot error', {
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
        logger.warn('gRPC Client: Health check failed', { error: error.message });
        resolve(false);
      } else {
        logger.info('gRPC Client: Connection healthy');
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

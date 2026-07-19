const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class AppointmentGrpcClient {
  constructor() {
    this.client = null;
  }

  initialize() {
    try {
      const PROTO_PATH = path.join(__dirname, '../../proto/appointment.proto');
      
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
      });

      const appointmentProto = grpc.loadPackageDefinition(packageDefinition).appointment;

      const address = `${config.services.appointment.grpcHost}:${config.services.appointment.grpcPort}`;
      
      this.client = new appointmentProto.AppointmentService(
        address,
        grpc.credentials.createInsecure()
      );

      logger.info(`Appointment gRPC client initialized at ${address}`);
    } catch (error) {
      logger.error('Failed to initialize Appointment gRPC client:', error);
      // Don't throw - appointment service may not have gRPC yet
      this.client = null;
    }
  }

  /**
   * Get user appointments
   */
  async getUserAppointments(userId, authToken, status = null, limit = 10, page = 1) {
    if (!this.client) {
      logger.warn('Appointment gRPC client not available');
      return { success: false, message: 'Appointment service unavailable', appointments: [] };
    }

    return new Promise((resolve, reject) => {
      this.client.GetUserAppointments(
        {
          user_id: userId,
          auth_token: authToken,
          status: status || '',
          limit,
          page
        },
        (error, response) => {
          if (error) {
            logger.error('Error getting user appointments:', error);
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId, authToken) {
    if (!this.client) {
      logger.warn('Appointment gRPC client not available');
      return { success: false, message: 'Appointment service unavailable' };
    }

    return new Promise((resolve, reject) => {
      this.client.GetAppointmentById(
        {
          appointment_id: appointmentId,
          auth_token: authToken
        },
        (error, response) => {
          if (error) {
            logger.error('Error getting appointment by ID:', error);
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }
}

module.exports = new AppointmentGrpcClient();

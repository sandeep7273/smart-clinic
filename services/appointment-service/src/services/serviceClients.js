/**
 * Service Clients
 * HTTP clients for external microservices with circuit breaker pattern
 * gRPC clients for fast inter-service communication
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { createCircuitBreaker, BusinessError } = require('../utils/circuitBreaker');
const { ServiceUnavailableError } = require('../utils/errors');
const grpcDoctorClient = require('../grpc/doctorClient');

/**
 * Base HTTP client configuration
 */
const createHttpClient = (baseURL, serviceName) => {
    console.log(`debugging Creating HTTP client for ${serviceName} with baseURL: ${baseURL}`);
  const client = axios.create({
    baseURL,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      logger.debug(`${serviceName} request:`, {
        method: config.method,
        url: config.url,
        data: config.data,
      });
      return config;
    },
    (error) => {
      logger.error(`${serviceName} request error:`, error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for logging
  client.interceptors.response.use(
    (response) => {
      logger.debug(`${serviceName} response:`, {
        status: response.status,
        data: response.data,
      });
      return response;
    },
    (error) => {
      logger.error(`${serviceName} response error:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Doctor Service Client
 */
const doctorServiceClient = createHttpClient(config.doctorServiceUrl, 'DoctorService');
const doctorService = {
  /**
   * Check doctor availability for a specific slot - Using gRPC
   */
  checkAvailability: createCircuitBreaker(
    async (doctorId, date, startTime, endTime, authToken) => {
      try {
        console.log(`debugging Checking availability via gRPC for doctor: ${doctorId}`);
        
        // Use gRPC client
        const response = await grpcDoctorClient.checkAvailability(
          doctorId,
          date,
          startTime,
          endTime,
          authToken
        );

        if (!response.success) {
          throw new Error(response.message || 'Failed to check availability');
        }

        return {
          success: response.success,
          message: response.message,
          data: response.data,
        };
      } catch (error) {
        console.error('❌ Check availability gRPC error:', {
          message: error.message,
          code: error.code,
        });
        
        // gRPC specific error handling
        if (error.code === 'UNAVAILABLE' || error.code === 'DEADLINE_EXCEEDED') {
          throw new ServiceUnavailableError('Doctor Service (gRPC)');
        }
        
        const errorMessage = error.message || 'Doctor Service gRPC error';
        throw new Error(`Doctor Service gRPC error: ${errorMessage}`);
      }
    },
    { name: 'DoctorService.checkAvailability (gRPC)' }
  ),

  /**
   * Reserve a slot for an appointment - Using gRPC
   */
  reserveSlot: createCircuitBreaker(
    async (doctorId, slotData, authToken) => {
      try {
        logger.info('Calling doctor service reserveSlot via gRPC', {
          doctorId,
          slotData,
          hasToken: !!authToken,
        });
        
        // Use gRPC client with full slot data
        const response = await grpcDoctorClient.reserveSlot(
          doctorId,
          slotData.slotId || slotData._id || '',
          slotData.patientId,
          authToken,
          {
            date: slotData.date,
            startTime: slotData.startTime,
            endTime: slotData.endTime,
            duration: slotData.duration,
          }
        );

        if (!response.success) {
          // Check for business errors (slot already booked, etc.)
          if (response.message && response.message.includes('already booked')) {
            throw new BusinessError(
              response.message || 'Slot is not available',
              409,
              new Error(response.message)
            );
          }
          
          throw new Error(response.message || 'Failed to reserve slot');
        }

        console.log(`✅ Slot reserved successfully via gRPC`);
        return {
          success: response.success,
          message: response.message,
          data: response.data,
        };
      } catch (error) {
        logger.error('Reserve slot gRPC error:', {
          message: error.message,
          code: error.code,
        });
        
        // gRPC specific error handling
        if (error.code === 'UNAVAILABLE' || error.code === 'DEADLINE_EXCEEDED') {
          throw new ServiceUnavailableError('Doctor Service (gRPC)');
        }
        
        // If it's already a BusinessError, rethrow it
        if (error instanceof BusinessError) {
          throw error;
        }
        
        // Other errors
        const errorMessage = error.message || 'Doctor Service gRPC error';
        throw new Error(`Doctor Service gRPC error: ${errorMessage}`);
      }
    },
    { name: 'DoctorService.reserveSlot (gRPC)' }
  ),

  /**
   * Release a reserved slot (compensation) - Using gRPC
   */
  releaseSlot: createCircuitBreaker(
    async (doctorId, slotId, authToken) => {
      try {
        logger.info('Calling doctor service releaseSlot via gRPC', {
          doctorId,
          slotId,
        });
        
        // Use gRPC client
        const response = await grpcDoctorClient.releaseSlot(
          doctorId,
          slotId,
          authToken
        );

        if (!response.success) {
          // Slot not found or already released is not a critical error for compensation
          logger.warn('Release slot returned non-success, but continuing', {
            message: response.message,
          });
        }

        return {
          success: response.success,
          message: response.message,
        };
      } catch (error) {
        logger.error('Release slot gRPC error:', {
          message: error.message,
          code: error.code,
        });
        
        // gRPC specific error handling
        if (error.code === 'UNAVAILABLE' || error.code === 'DEADLINE_EXCEEDED') {
          throw new ServiceUnavailableError('Doctor Service (gRPC)');
        }
        
        // If it's already a BusinessError, rethrow it
        if (error instanceof BusinessError) {
          throw error;
        }
        
        // For compensation actions, we might want to be more lenient
        logger.warn('Release slot failed but continuing (compensation)', {
          error: error.message,
        });
        
        return {
          success: false,
          message: error.message,
        };
      }
    },
    { name: 'DoctorService.releaseSlot (gRPC)' }
  ),

  /**
   * Get doctor details - Using gRPC for fast inter-service communication
   */
  getDoctorDetails: createCircuitBreaker(
    async (doctorId, authToken) => {
      try {
        console.log(`debugging Fetching doctor details via gRPC for ID: ${doctorId}`);
        
        // Use gRPC client instead of HTTP
        const response = await grpcDoctorClient.getDoctorDetails(doctorId, authToken);

        if (!response.success) {
          throw new BusinessError(
            response.message || 'Doctor not found',
            404,
            new Error(response.message)
          );
        }

        // Convert gRPC response to match existing API format
        return {
          success: response.success,
          message: response.message,
          data: response.data,
        };
      } catch (error) {
        console.error('❌ Get doctor details gRPC error:', {
          message: error.message,
          code: error.code,
        });
        
        // gRPC specific error handling
        if (error.code === 'UNAVAILABLE' || error.code === 'DEADLINE_EXCEEDED') {
          throw new ServiceUnavailableError('Doctor Service (gRPC)');
        }
        
        // If it's already a BusinessError, rethrow it
        if (error instanceof BusinessError) {
          throw error;
        }
        
        // Other gRPC errors
        const errorMessage = error.message || 'Doctor Service gRPC error';
        throw new Error(`Doctor Service gRPC error: ${errorMessage}`);
      }
    },
    { name: 'DoctorService.getDoctorDetails (gRPC)' }
  ),
};


/**
 * Notification Service Client
 */
const notificationServiceClient = createHttpClient(
  config.notificationServiceUrl,
  'NotificationService'
);

const notificationService = {
  /**
   * Send appointment confirmation
   */
  sendAppointmentConfirmation: createCircuitBreaker(
    async (appointmentData, authToken) => {
      try {
        const response = await notificationServiceClient.post(
          '/notifications/appointment/confirmation',
          appointmentData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        logger.warn('Failed to send confirmation notification:', error);
        // Don't throw - notification failure shouldn't break appointment creation
        return null;
      }
    },
    { name: 'NotificationService.sendAppointmentConfirmation' }
  ),

  /**
   * Send appointment reminder
   */
  sendAppointmentReminder: createCircuitBreaker(
    async (appointmentData, authToken) => {
      try {
        const response = await notificationServiceClient.post(
          '/notifications/appointment/reminder',
          appointmentData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        logger.warn('Failed to send reminder notification:', error);
        return null;
      }
    },
    { name: 'NotificationService.sendAppointmentReminder' }
  ),

  /**
   * Send cancellation notification
   */
  sendCancellationNotification: createCircuitBreaker(
    async (appointmentData, authToken) => {
      try {
        const response = await notificationServiceClient.post(
          '/notifications/appointment/cancellation',
          appointmentData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        logger.warn('Failed to send cancellation notification:', error);
        return null;
      }
    },
    { name: 'NotificationService.sendCancellationNotification' }
  ),
};

module.exports = {
  doctorService,
  notificationService,
};

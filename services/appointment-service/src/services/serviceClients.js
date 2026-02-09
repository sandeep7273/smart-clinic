/**
 * Service Clients
 * HTTP clients for external microservices with circuit breaker pattern
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { createCircuitBreaker } = require('../utils/circuitBreaker');
const { ServiceUnavailableError } = require('../utils/errors');

/**
 * Base HTTP client configuration
 */
const createHttpClient = (baseURL, serviceName) => {
  const client = axios.create({
    baseURL,
    timeout: 5000,
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
   * Check doctor availability for a specific slot
   */
  checkAvailability: createCircuitBreaker(
    async (doctorId, date, startTime, endTime, authToken) => {
      try {
        const response = await doctorServiceClient.post(
          `/doctors/${doctorId}/availability/check`,
          {
            date,
            startTime,
            endTime,
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error('Doctor not found');
        }
        throw new ServiceUnavailableError('Doctor Service');
      }
    },
    { name: 'DoctorService.checkAvailability' }
  ),

  /**
   * Reserve a slot for an appointment
   */
  reserveSlot: createCircuitBreaker(
    async (doctorId, slotData, authToken) => {
      try {
        const response = await doctorServiceClient.post(
          `/doctors/${doctorId}/slots/reserve`,
          slotData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        if (error.response?.status === 409) {
          throw new Error('Slot already booked');
        }
        throw new ServiceUnavailableError('Doctor Service');
      }
    },
    { name: 'DoctorService.reserveSlot' }
  ),

  /**
   * Release a reserved slot (compensation)
   */
  releaseSlot: createCircuitBreaker(
    async (doctorId, slotId, authToken) => {
      try {
        const response = await doctorServiceClient.post(
          `/doctors/${doctorId}/slots/${slotId}/release`,
          {},
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        return response.data;
      } catch (error) {
        logger.error('Failed to release slot:', error);
        throw new ServiceUnavailableError('Doctor Service');
      }
    },
    { name: 'DoctorService.releaseSlot' }
  ),

  /**
   * Get doctor details
   */
  getDoctorDetails: createCircuitBreaker(
    async (doctorId, authToken) => {
      try {
        const response = await doctorServiceClient.get(`/doctors/${doctorId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error('Doctor not found');
        }
        throw new ServiceUnavailableError('Doctor Service');
      }
    },
    { name: 'DoctorService.getDoctorDetails' }
  ),
};

/**
 * User Service Client
 */
const userServiceClient = createHttpClient(config.userServiceUrl, 'UserService');

const userService = {
  /**
   * Get patient details
   */
  getPatientDetails: createCircuitBreaker(
    async (userId, authToken) => {
      try {
        const response = await userServiceClient.get(`/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          throw new Error('Patient not found');
        }
        throw new ServiceUnavailableError('User Service');
      }
    },
    { name: 'UserService.getPatientDetails' }
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
  userService,
  notificationService,
};

/**
 * Configuration Module
 * Centralized configuration for Appointment Service
 */

require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 4004,
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: 'appointment-service',

  // MongoDB Configuration
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/appointment_service',
  mongoOptions: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },

  // External Service URLs
  doctorServiceUrl: process.env.DOCTOR_SERVICE_URL || 'http://localhost:4003',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:4002',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005',

  // Kafka Configuration
  kafka: {
    brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    clientId: 'appointment-service',
    groupId: 'appointment-service-group',
    topics: {
      appointmentCreated: 'appointment.created',
      appointmentUpdated: 'appointment.updated',
      appointmentCancelled: 'appointment.cancelled',
      appointmentConfirmed: 'appointment.confirmed',
      appointmentCompleted: 'appointment.completed',
      slotReserved: 'slot.reserved',
      slotReleased: 'slot.released',
    },
  },

  // Circuit Breaker Configuration
  circuitBreaker: {
    timeout: 500000, // 500 seconds
    errorThresholdPercentage: 500,
    resetTimeout: 300000, // 300 seconds
  },

  // Saga Configuration
  saga: {
    timeoutMs: 300000, // 300 seconds for saga completion
    maxRetries: 30,
    retryDelayMs: 1000,
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // Pagination Defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Appointment Configuration
  appointment: {
    statuses: {
      PENDING: 'pending',
      CONFIRMED: 'confirmed',
      CANCELLED: 'cancelled',
      COMPLETED: 'completed',
      NO_SHOW: 'no_show',
    },
    cancellationWindow: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    reminderWindow: 24 * 60 * 60 * 1000, // 24 hours before appointment
  },
};

module.exports = config;

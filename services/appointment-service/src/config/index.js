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
  // doctorServiceUrl: process.env.DOCTOR_SERVICE_URL || 'http://localhost:4003',
  doctorGrpcUrl: process.env.DOCTOR_GRPC_URL || 'localhost:50051',
  // API Gateway URL for service-to-service communication
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3000',


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
    timeout: 120000, // 2 minutes (120 seconds) - increased for testing
    errorThresholdPercentage: 90, // 90% - very lenient for testing
    resetTimeout: 10000, // 10 seconds - quick recovery for testing
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

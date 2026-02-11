/**
 * Kafka Integration for Doctor Service
 * Handles producer and consumer for doctor-related events
 */

const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'doctor-service',
  brokers: [process.env.KAFKA_BROKER_URL || 'localhost:9092'],
  connectionTimeout: 3000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Create producer and consumer
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000
});

const consumer = kafka.consumer({
  groupId: 'doctor-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

// Topic names
const TOPICS = {
  DOCTOR_EVENTS: 'doctor-events',
  USER_EVENTS: 'user-events',
  APPOINTMENT_EVENTS: 'appointment-events'
};

/**
 * Event types for doctor service
 */
const EVENT_TYPES = {
  // Doctor events
  DOCTOR_CREATED: 'DOCTOR_CREATED',
  DOCTOR_UPDATED: 'DOCTOR_UPDATED',
  DOCTOR_DELETED: 'DOCTOR_DELETED',
  DOCTOR_STATUS_CHANGED: 'DOCTOR_STATUS_CHANGED',
  DOCTOR_AVAILABILITY_UPDATED: 'DOCTOR_AVAILABILITY_UPDATED',
  DOCTOR_SLOT_RESERVED: 'DOCTOR_SLOT_RESERVED',
  DOCTOR_SLOT_RELEASED: 'DOCTOR_SLOT_RELEASED',
  DOCTOR_SERVICES_UPDATED: 'DOCTOR_SERVICES_UPDATED',
  DOCTOR_PROFILE_VERIFIED: 'DOCTOR_PROFILE_VERIFIED',
  
  // Incoming events from other services
  USER_REGISTERED: 'USER_REGISTERED',
  USER_PROFILE_UPDATED: 'USER_PROFILE_UPDATED',
  APPOINTMENT_BOOKED: 'APPOINTMENT_BOOKED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED'
};

/**
 * Publish doctor event to Kafka
 */
const publishDoctorEvent = async (eventType, payload, metadata = {}) => {
  try {
    const message = {
      key: payload.doctorId || metadata.entityId || 'unknown',
      value: JSON.stringify({
        eventType,
        payload,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          service: 'doctor-service',
          version: '1.0.0',
          correlationId: metadata.correlationId || generateCorrelationId()
        }
      })
    };

    await producer.send({
      topic: TOPICS.DOCTOR_EVENTS,
      messages: [message]
    });

    logger.info('Doctor event published:', {
      eventType,
      doctorId: payload.doctorId,
      correlationId: metadata.correlationId
    });

  } catch (error) {
    // Log error but don't throw - service should continue without Kafka
    logger.warn('Failed to publish doctor event (Kafka may not be available):', {
      eventType,
      doctorId: payload.doctorId,
      error: error.message
    });
    // Don't throw - allow service to continue without event publishing
  }
};

/**
 * Handle incoming events from other services
 */
const handleIncomingEvent = async (eventType, payload, metadata) => {
  try {
    logger.info('Processing incoming event:', {
      eventType,
      metadata
    });

    switch (eventType) {
      case EVENT_TYPES.USER_REGISTERED:
        await handleUserRegistered(payload, metadata);
        break;

      case EVENT_TYPES.USER_PROFILE_UPDATED:
        await handleUserProfileUpdated(payload, metadata);
        break;

      case EVENT_TYPES.APPOINTMENT_BOOKED:
        await handleAppointmentBooked(payload, metadata);
        break;

      case EVENT_TYPES.APPOINTMENT_CANCELLED:
        await handleAppointmentCancelled(payload, metadata);
        break;

      case EVENT_TYPES.APPOINTMENT_COMPLETED:
        await handleAppointmentCompleted(payload, metadata);
        break;

      default:
        logger.warn('Unhandled event type:', { eventType, metadata });
    }

  } catch (error) {
    logger.error('Error handling incoming event:', {
      eventType,
      payload,
      metadata,
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Handle user registration event
 */
const handleUserRegistered = async (payload, metadata) => {
  const { userId, email, role } = payload;

  // If user is registering as a doctor, create doctor profile
  if (role === 'doctor') {
    logger.info('Creating doctor profile for newly registered user:', {
      userId,
      email,
      correlationId: metadata.correlationId
    });

    // Publish doctor creation event
    await publishDoctorEvent(EVENT_TYPES.DOCTOR_CREATED, {
      doctorId: userId,
      email,
      status: 'pending_verification',
      createdBy: 'system',
      source: 'user_registration'
    }, metadata);
  }
};

/**
 * Handle user profile update event
 */
const handleUserProfileUpdated = async (payload, metadata) => {
  const { userId, role, profileData } = payload;

  // If user role changed to doctor, create doctor profile
  if (role === 'doctor') {
    await publishDoctorEvent(EVENT_TYPES.DOCTOR_CREATED, {
      doctorId: userId,
      ...profileData,
      status: 'pending_verification',
      source: 'profile_update'
    }, metadata);
  }
};

/**
 * Handle appointment booked event
 */
const handleAppointmentBooked = async (payload, metadata) => {
  const { appointmentId, doctorId, slotId, patientId, dateTime } = payload;

  logger.info('Handling appointment booked:', {
    appointmentId,
    doctorId,
    slotId,
    correlationId: metadata.correlationId
  });

  // Reserve the slot
  await publishDoctorEvent(EVENT_TYPES.DOCTOR_SLOT_RESERVED, {
    doctorId,
    slotId,
    appointmentId,
    patientId,
    dateTime,
    reservedAt: new Date().toISOString()
  }, metadata);
};

/**
 * Handle appointment cancelled event
 */
const handleAppointmentCancelled = async (payload, metadata) => {
  const { appointmentId, doctorId, slotId } = payload;

  logger.info('Handling appointment cancelled:', {
    appointmentId,
    doctorId,
    slotId,
    correlationId: metadata.correlationId
  });

  // Release the slot
  await publishDoctorEvent(EVENT_TYPES.DOCTOR_SLOT_RELEASED, {
    doctorId,
    slotId,
    appointmentId,
    releasedAt: new Date().toISOString(),
    reason: 'appointment_cancelled'
  }, metadata);
};

/**
 * Handle appointment completed event
 */
const handleAppointmentCompleted = async (payload, metadata) => {
  const { appointmentId, doctorId, rating, feedback } = payload;

  logger.info('Handling appointment completed:', {
    appointmentId,
    doctorId,
    correlationId: metadata.correlationId
  });

  // Update doctor metrics
  await publishDoctorEvent(EVENT_TYPES.DOCTOR_UPDATED, {
    doctorId,
    appointmentCompleted: true,
    rating,
    feedback,
    completedAt: new Date().toISOString()
  }, metadata);
};

/**
 * Initialize Kafka producer
 */
const initializeProducer = async () => {
  try {
    await producer.connect();
    logger.info('Kafka producer connected successfully');
  } catch (error) {
    logger.error('Failed to connect Kafka producer:', error);
    throw error;
  }
};

/**
 * Initialize Kafka consumer
 */
const initializeConsumer = async () => {
  try {
    await consumer.connect();
    
    // Subscribe to relevant topics
    await consumer.subscribe({
      topics: [TOPICS.USER_EVENTS, TOPICS.APPOINTMENT_EVENTS],
      fromBeginning: false
    });

    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = JSON.parse(message.value.toString());
          const { eventType, payload, metadata } = messageValue;

          logger.debug('Received message:', {
            topic,
            partition,
            eventType,
            correlationId: metadata?.correlationId
          });

          await handleIncomingEvent(eventType, payload, metadata);

        } catch (error) {
          logger.error('Error processing message:', {
            topic,
            partition,
            error: error.message,
            messageValue: message.value.toString()
          });
        }
      }
    });

    logger.info('Kafka consumer initialized and running');
  } catch (error) {
    logger.error('Failed to initialize Kafka consumer:', error);
    throw error;
  }
};

/**
 * Graceful shutdown
 */
const shutdown = async () => {
  try {
    logger.info('Shutting down Kafka connections...');
    await consumer.disconnect();
    await producer.disconnect();
    logger.info('Kafka connections closed successfully');
  } catch (error) {
    logger.error('Error during Kafka shutdown:', error);
  }
};

/**
 * Generate correlation ID
 */
const generateCorrelationId = () => {
  return `doctor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Handle process termination
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown().then(() => process.exit(1));
});

module.exports = {
  producer,
  consumer,
  publishDoctorEvent,
  initializeProducer,
  initializeConsumer,
  shutdown,
  TOPICS,
  EVENT_TYPES
};
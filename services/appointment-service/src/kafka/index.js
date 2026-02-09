/**
 * Kafka Integration for Appointment Service
 * Handles SAGA orchestration, CQRS events, and Event Sourcing
 */

const { Kafka } = require('kafkajs');
const logger = require('../utils/logger');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'appointment-service',
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
  groupId: 'appointment-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

// Topic names
const TOPICS = {
  // Appointment events (Event Sourcing)
  APPOINTMENT_EVENTS: 'appointment-events',
  
  // SAGA orchestration topics
  SAGA_EVENTS: 'saga-events',
  
  // CQRS command and query topics
  APPOINTMENT_COMMANDS: 'appointment-commands',
  APPOINTMENT_QUERIES: 'appointment-queries',
  
  // Integration with other services
  USER_EVENTS: 'user-events',
  DOCTOR_EVENTS: 'doctor-events',
  NOTIFICATION_EVENTS: 'notification-events',
  PAYMENT_EVENTS: 'payment-events',
  
  // Read model updates
  APPOINTMENT_PROJECTIONS: 'appointment-projections'
};

/**
 * Event types for appointment service (Event Sourcing)
 */
const EVENT_TYPES = {
  // Core appointment events
  APPOINTMENT_REQUESTED: 'APPOINTMENT_REQUESTED',
  APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_STARTED: 'APPOINTMENT_STARTED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  APPOINTMENT_NO_SHOW: 'APPOINTMENT_NO_SHOW',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  
  // SAGA events
  SAGA_STARTED: 'SAGA_STARTED',
  SAGA_STEP_STARTED: 'SAGA_STEP_STARTED',
  SAGA_STEP_COMPLETED: 'SAGA_STEP_COMPLETED',
  SAGA_STEP_FAILED: 'SAGA_STEP_FAILED',
  SAGA_COMPLETED: 'SAGA_COMPLETED',
  SAGA_FAILED: 'SAGA_FAILED',
  SAGA_COMPENSATING: 'SAGA_COMPENSATING',
  SAGA_COMPENSATED: 'SAGA_COMPENSATED',
  
  // Payment integration events
  PAYMENT_REQUESTED: 'PAYMENT_REQUESTED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  
  // Notification events
  APPOINTMENT_REMINDER_SENT: 'APPOINTMENT_REMINDER_SENT',
  APPOINTMENT_CONFIRMATION_SENT: 'APPOINTMENT_CONFIRMATION_SENT',
  APPOINTMENT_CANCELLATION_SENT: 'APPOINTMENT_CANCELLATION_SENT',
  
  // Doctor service events (incoming)
  DOCTOR_SLOT_RESERVED: 'DOCTOR_SLOT_RESERVED',
  DOCTOR_SLOT_RELEASED: 'DOCTOR_SLOT_RELEASED',
  DOCTOR_AVAILABILITY_UPDATED: 'DOCTOR_AVAILABILITY_UPDATED',
  
  // User service events (incoming)
  USER_PROFILE_UPDATED: 'USER_PROFILE_UPDATED',
  USER_DELETED: 'USER_DELETED',
  
  // Read model projection events
  APPOINTMENT_PROJECTION_UPDATED: 'APPOINTMENT_PROJECTION_UPDATED',
  APPOINTMENT_STATS_UPDATED: 'APPOINTMENT_STATS_UPDATED'
};

/**
 * SAGA step definitions for appointment booking
 */
const SAGA_STEPS = {
  VALIDATE_APPOINTMENT: 'VALIDATE_APPOINTMENT',
  RESERVE_SLOT: 'RESERVE_SLOT',
  PROCESS_PAYMENT: 'PROCESS_PAYMENT',
  SEND_CONFIRMATION: 'SEND_CONFIRMATION',
  UPDATE_PATIENT_HISTORY: 'UPDATE_PATIENT_HISTORY',
  CREATE_APPOINTMENT_RECORD: 'CREATE_APPOINTMENT_RECORD'
};

/**
 * Publish appointment event (Event Sourcing)
 */
const publishAppointmentEvent = async (eventType, payload, context = {}) => {
  try {
    const eventId = generateEventId();
    const timestamp = new Date().toISOString();
    
    // Create event message with Event Sourcing metadata
    const eventMessage = {
      eventId,
      eventType,
      aggregateId: payload.appointmentId || payload.id,
      aggregateType: 'Appointment',
      version: payload.version || 1,
      payload,
      metadata: {
        ...context,
        timestamp,
        service: 'appointment-service',
        serviceVersion: '1.0.0',
        correlationId: context.correlationId || generateCorrelationId(),
        causationId: context.causationId || null,
        userId: context.userId || context.user?.userId,
        userRole: context.userRole || context.user?.role,
        ip: context.ip,
        userAgent: context.userAgent
      }
    };

    const message = {
      key: eventMessage.aggregateId,
      value: JSON.stringify(eventMessage),
      headers: {
        'event-type': eventType,
        'correlation-id': eventMessage.metadata.correlationId,
        'causation-id': eventMessage.metadata.causationId || '',
        'timestamp': timestamp
      }
    };

    await producer.send({
      topic: TOPICS.APPOINTMENT_EVENTS,
      messages: [message]
    });

    logger.info('Appointment event published:', {
      eventId,
      eventType,
      aggregateId: eventMessage.aggregateId,
      version: eventMessage.version,
      correlationId: eventMessage.metadata.correlationId
    });

    return eventMessage;

  } catch (error) {
    logger.error('Failed to publish appointment event:', {
      eventType,
      payload,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Publish SAGA event
 */
const publishSagaEvent = async (sagaId, eventType, stepName, payload, context = {}) => {
  try {
    const sagaEvent = {
      sagaId,
      eventType,
      stepName,
      payload,
      metadata: {
        ...context,
        timestamp: new Date().toISOString(),
        service: 'appointment-service',
        correlationId: context.correlationId || generateCorrelationId()
      }
    };

    const message = {
      key: sagaId,
      value: JSON.stringify(sagaEvent),
      headers: {
        'saga-id': sagaId,
        'event-type': eventType,
        'step-name': stepName,
        'correlation-id': sagaEvent.metadata.correlationId
      }
    };

    await producer.send({
      topic: TOPICS.SAGA_EVENTS,
      messages: [message]
    });

    logger.info('SAGA event published:', {
      sagaId,
      eventType,
      stepName,
      correlationId: sagaEvent.metadata.correlationId
    });

  } catch (error) {
    logger.error('Failed to publish SAGA event:', {
      sagaId,
      eventType,
      stepName,
      error: error.message
    });
    throw error;
  }
};

/**
 * Handle incoming events from other services
 */
const handleIncomingEvent = async (eventType, payload, metadata) => {
  try {
    logger.info('Processing incoming event:', {
      eventType,
      payload: { ...payload, sensitiveData: '[REDACTED]' },
      correlationId: metadata.correlationId
    });

    switch (eventType) {
      // Doctor service events
      case EVENT_TYPES.DOCTOR_SLOT_RESERVED:
        await handleDoctorSlotReserved(payload, metadata);
        break;

      case EVENT_TYPES.DOCTOR_SLOT_RELEASED:
        await handleDoctorSlotReleased(payload, metadata);
        break;

      case EVENT_TYPES.DOCTOR_AVAILABILITY_UPDATED:
        await handleDoctorAvailabilityUpdated(payload, metadata);
        break;

      // User service events
      case EVENT_TYPES.USER_PROFILE_UPDATED:
        await handleUserProfileUpdated(payload, metadata);
        break;

      case EVENT_TYPES.USER_DELETED:
        await handleUserDeleted(payload, metadata);
        break;

      // Payment service events
      case EVENT_TYPES.PAYMENT_COMPLETED:
        await handlePaymentCompleted(payload, metadata);
        break;

      case EVENT_TYPES.PAYMENT_FAILED:
        await handlePaymentFailed(payload, metadata);
        break;

      case EVENT_TYPES.PAYMENT_REFUNDED:
        await handlePaymentRefunded(payload, metadata);
        break;

      // Notification service events
      case EVENT_TYPES.APPOINTMENT_CONFIRMATION_SENT:
        await handleNotificationSent(payload, metadata, 'confirmation');
        break;

      case EVENT_TYPES.APPOINTMENT_REMINDER_SENT:
        await handleNotificationSent(payload, metadata, 'reminder');
        break;

      default:
        logger.warn('Unhandled event type:', { 
          eventType, 
          correlationId: metadata.correlationId 
        });
    }

  } catch (error) {
    logger.error('Error handling incoming event:', {
      eventType,
      error: error.message,
      stack: error.stack,
      correlationId: metadata.correlationId
    });
    
    // Publish error event for monitoring
    await publishAppointmentEvent('EVENT_PROCESSING_FAILED', {
      originalEvent: eventType,
      error: error.message,
      metadata
    });
  }
};

/**
 * Handle doctor slot reserved event
 */
const handleDoctorSlotReserved = async (payload, metadata) => {
  const { slotId, appointmentId, doctorId, reservedAt } = payload;

  logger.info('Handling doctor slot reserved:', {
    slotId,
    appointmentId,
    doctorId,
    correlationId: metadata.correlationId
  });

  // Update appointment status and continue SAGA
  await publishAppointmentEvent('SLOT_RESERVED', {
    appointmentId,
    slotId,
    doctorId,
    reservedAt
  }, metadata);

  // Continue SAGA to next step
  await publishSagaEvent(
    metadata.sagaId,
    EVENT_TYPES.SAGA_STEP_COMPLETED,
    SAGA_STEPS.RESERVE_SLOT,
    { appointmentId, slotId },
    metadata
  );
};

/**
 * Handle doctor slot released event
 */
const handleDoctorSlotReleased = async (payload, metadata) => {
  const { slotId, appointmentId, reason } = payload;

  logger.info('Handling doctor slot released:', {
    slotId,
    appointmentId,
    reason,
    correlationId: metadata.correlationId
  });

  // Update appointment to reflect slot release
  await publishAppointmentEvent('SLOT_RELEASED', {
    appointmentId,
    slotId,
    reason,
    releasedAt: new Date().toISOString()
  }, metadata);
};

/**
 * Handle payment completion
 */
const handlePaymentCompleted = async (payload, metadata) => {
  const { appointmentId, paymentId, amount } = payload;

  logger.info('Handling payment completed:', {
    appointmentId,
    paymentId,
    amount,
    correlationId: metadata.correlationId
  });

  // Update appointment payment status
  await publishAppointmentEvent('PAYMENT_COMPLETED', {
    appointmentId,
    paymentId,
    amount,
    completedAt: new Date().toISOString()
  }, metadata);

  // Continue SAGA
  if (metadata.sagaId) {
    await publishSagaEvent(
      metadata.sagaId,
      EVENT_TYPES.SAGA_STEP_COMPLETED,
      SAGA_STEPS.PROCESS_PAYMENT,
      { appointmentId, paymentId },
      metadata
    );
  }
};

/**
 * Handle payment failure
 */
const handlePaymentFailed = async (payload, metadata) => {
  const { appointmentId, paymentId, error: paymentError } = payload;

  logger.error('Handling payment failed:', {
    appointmentId,
    paymentId,
    error: paymentError,
    correlationId: metadata.correlationId
  });

  // Update appointment payment status
  await publishAppointmentEvent('PAYMENT_FAILED', {
    appointmentId,
    paymentId,
    error: paymentError,
    failedAt: new Date().toISOString()
  }, metadata);

  // Trigger SAGA compensation
  if (metadata.sagaId) {
    await publishSagaEvent(
      metadata.sagaId,
      EVENT_TYPES.SAGA_STEP_FAILED,
      SAGA_STEPS.PROCESS_PAYMENT,
      { appointmentId, paymentId, error: paymentError },
      metadata
    );
  }
};

/**
 * Handle user profile update
 */
const handleUserProfileUpdated = async (payload, metadata) => {
  const { userId, profileData } = payload;

  logger.info('Handling user profile updated:', {
    userId,
    correlationId: metadata.correlationId
  });

  // Update read models with new user data
  await publishAppointmentEvent('USER_PROFILE_UPDATED', {
    userId,
    profileData: {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone
    }
  }, metadata);
};

/**
 * Handle user deletion
 */
const handleUserDeleted = async (payload, metadata) => {
  const { userId } = payload;

  logger.info('Handling user deleted:', {
    userId,
    correlationId: metadata.correlationId
  });

  // Cancel all future appointments for the user
  await publishAppointmentEvent('USER_DELETED', {
    userId,
    deletedAt: new Date().toISOString()
  }, metadata);
};

/**
 * Handle notification sent confirmation
 */
const handleNotificationSent = async (payload, metadata, type) => {
  const { appointmentId, notificationId, channel, status } = payload;

  logger.info(`Handling ${type} notification sent:`, {
    appointmentId,
    notificationId,
    channel,
    status,
    correlationId: metadata.correlationId
  });

  // Update appointment with notification status
  await publishAppointmentEvent('NOTIFICATION_SENT', {
    appointmentId,
    notificationId,
    type,
    channel,
    status,
    sentAt: new Date().toISOString()
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
      topics: [
        TOPICS.USER_EVENTS,
        TOPICS.DOCTOR_EVENTS,
        TOPICS.PAYMENT_EVENTS,
        TOPICS.NOTIFICATION_EVENTS
      ],
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
            correlationId: metadata?.correlationId,
            messageHeaders: message.headers
          });

          await handleIncomingEvent(eventType, payload, metadata);

        } catch (error) {
          logger.error('Error processing message:', {
            topic,
            partition,
            error: error.message,
            messageValue: message.value.toString(),
            stack: error.stack
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
 * Generate unique event ID
 */
const generateEventId = () => {
  return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate correlation ID
 */
const generateCorrelationId = () => {
  return `appt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
  publishAppointmentEvent,
  publishSagaEvent,
  initializeProducer,
  initializeConsumer,
  shutdown,
  TOPICS,
  EVENT_TYPES,
  SAGA_STEPS
};
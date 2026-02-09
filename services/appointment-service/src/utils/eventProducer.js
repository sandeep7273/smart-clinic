/**
 * Event Producer
 * Kafka event publishing with Outbox Pattern
 */

const { Kafka } = require('kafkajs');
const config = require('../config');
const logger = require('./logger');
const { OutboxEvent } = require('../models/OutboxEvent');
const { v4: uuidv4 } = require('uuid');

// Initialize Kafka
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer = kafka.producer();

let isConnected = false;

/**
 * Connect to Kafka
 */
const connectProducer = async () => {
  if (isConnected) return;

  try {
    await producer.connect();
    isConnected = true;
    logger.info('Kafka producer connected', {
      brokers: config.kafka.brokers,
    });
  } catch (error) {
    logger.error('Failed to connect Kafka producer:', error);
    throw error;
  }
};

/**
 * Disconnect from Kafka
 */
const disconnectProducer = async () => {
  if (!isConnected) return;

  try {
    await producer.disconnect();
    isConnected = false;
    logger.info('Kafka producer disconnected');
  } catch (error) {
    logger.error('Failed to disconnect Kafka producer:', error);
  }
};

/**
 * Publish event to Kafka using Outbox Pattern
 * 1. Save event to outbox table (same transaction as domain change)
 * 2. Background process publishes from outbox to Kafka
 */
const publishEvent = async (eventType, payload, options = {}) => {
  try {
    const eventId = options.eventId || uuidv4();
    const topic = options.topic || getTopicForEventType(eventType);

    // Create outbox event
    const outboxEvent = await OutboxEvent.createOutboxEvent({
      eventId,
      eventType,
      aggregateId: payload.appointmentId || payload.id,
      aggregateType: 'Appointment',
      payload,
      topic,
      metadata: {
        correlationId: options.correlationId,
        causationId: options.causationId,
        userId: options.userId,
      },
      tenantId: payload.tenantId,
    });

    logger.info('Event saved to outbox', {
      eventId,
      eventType,
      topic,
    });

    return outboxEvent;
  } catch (error) {
    logger.error('Failed to save event to outbox:', error);
    throw error;
  }
};

/**
 * Publish event directly to Kafka (bypass outbox - use with caution)
 */
const publishEventDirect = async (topic, eventType, payload, options = {}) => {
  try {
    if (!isConnected) {
      await connectProducer();
    }

    const message = {
      key: payload.appointmentId || payload.id || uuidv4(),
      value: JSON.stringify({
        eventId: options.eventId || uuidv4(),
        eventType,
        payload,
        metadata: {
          timestamp: new Date().toISOString(),
          correlationId: options.correlationId,
          causationId: options.causationId,
          userId: options.userId,
        },
      }),
      headers: {
        'event-type': eventType,
        'correlation-id': options.correlationId || '',
      },
    };

    await producer.send({
      topic,
      messages: [message],
    });

    logger.info('Event published to Kafka', {
      topic,
      eventType,
      key: message.key,
    });

    return true;
  } catch (error) {
    logger.error('Failed to publish event to Kafka:', error);
    throw error;
  }
};

/**
 * Process outbox events (background job)
 */
const processOutboxEvents = async () => {
  try {
    const pendingEvents = await OutboxEvent.getPendingEvents(100);

    if (pendingEvents.length === 0) {
      return 0;
    }

    logger.info(`Processing ${pendingEvents.length} outbox events`);

    for (const event of pendingEvents) {
      try {
        await publishEventDirect(
          event.topic,
          event.eventType,
          event.payload,
          {
            eventId: event.eventId,
            correlationId: event.metadata?.correlationId,
            causationId: event.metadata?.causationId,
            userId: event.metadata?.userId,
          }
        );

        await OutboxEvent.markPublished(event.eventId);
        
        logger.debug('Outbox event published', {
          eventId: event.eventId,
          eventType: event.eventType,
        });
      } catch (error) {
        logger.error('Failed to publish outbox event:', {
          eventId: event.eventId,
          error: error.message,
        });

        await OutboxEvent.markFailed(event.eventId, error);
      }
    }

    return pendingEvents.length;
  } catch (error) {
    logger.error('Failed to process outbox events:', error);
    throw error;
  }
};

/**
 * Start outbox processor (polling)
 */
const startOutboxProcessor = (intervalMs = 5000) => {
  logger.info('Starting outbox processor', { intervalMs });

  const intervalId = setInterval(async () => {
    try {
      await processOutboxEvents();
    } catch (error) {
      logger.error('Outbox processor error:', error);
    }
  }, intervalMs);

  // Return function to stop processor
  return () => {
    clearInterval(intervalId);
    logger.info('Outbox processor stopped');
  };
};

/**
 * Get Kafka topic for event type
 */
const getTopicForEventType = (eventType) => {
  const topicMap = {
    APPOINTMENT_CREATED: config.kafka.topics.appointmentCreated,
    APPOINTMENT_UPDATED: config.kafka.topics.appointmentUpdated,
    APPOINTMENT_CANCELLED: config.kafka.topics.appointmentCancelled,
    APPOINTMENT_CONFIRMED: config.kafka.topics.appointmentConfirmed,
    APPOINTMENT_COMPLETED: config.kafka.topics.appointmentCompleted,
    SLOT_RESERVED: config.kafka.topics.slotReserved,
    SLOT_RELEASED: config.kafka.topics.slotReleased,
  };

  return topicMap[eventType] || config.kafka.topics.appointmentUpdated;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectProducer();
});

process.on('SIGTERM', async () => {
  await disconnectProducer();
});

module.exports = {
  connectProducer,
  disconnectProducer,
  publishEvent,
  publishEventDirect,
  processOutboxEvents,
  startOutboxProcessor,
};

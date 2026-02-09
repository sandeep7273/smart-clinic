/**
 * Kafka Configuration for Auth Service
 * Handles event production and consumption for inter-service communication
 */

const { Kafka } = require('kafkajs');
const logger = require('../utils/logger.util');

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000
});

const consumer = kafka.consumer({
  groupId: 'auth-service-group',
  sessionTimeout: 30000,
  rebalanceTimeout: 60000
});

/**
 * Initialize Kafka connections
 */
const initializeKafka = async () => {
  try {
    logger.info('Connecting to Kafka...');
    
    await producer.connect();
    logger.info('Kafka producer connected');
    
    await consumer.connect();
    logger.info('Kafka consumer connected');
    
    // Subscribe to relevant topics
    await consumer.subscribe({
      topics: [
        'user.profile.update.request',
        'user.verification.request',
        'user.status.change.request'
      ]
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize Kafka:', error);
    return false;
  }
};

/**
 * Publish user events
 */
const publishUserEvent = async (eventType, data) => {
  try {
    const message = {
      topic: getTopicByEventType(eventType),
      messages: [{
        key: data.userId || data.id,
        value: JSON.stringify({
          eventType,
          timestamp: new Date().toISOString(),
          data,
          service: 'auth-service'
        }),
        headers: {
          'event-type': eventType,
          'service': 'auth-service',
          'version': '1.0'
        }
      }]
    };

    await producer.send(message);
    
    logger.info('User event published:', {
      eventType,
      topic: message.topic,
      userId: data.userId || data.id
    });
  } catch (error) {
    logger.error('Failed to publish user event:', {
      eventType,
      data,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get topic name by event type
 */
const getTopicByEventType = (eventType) => {
  const topicMap = {
    'USER_REGISTERED': 'user.registered',
    'USER_LOGGED_IN': 'user.logged.in',
    'USER_LOGGED_OUT': 'user.logged.out',
    'USER_PROFILE_UPDATED': 'user.profile.updated',
    'USER_EMAIL_VERIFIED': 'user.email.verified',
    'USER_PASSWORD_CHANGED': 'user.password.changed',
    'USER_STATUS_UPDATED': 'user.status.updated',
    'USER_ROLE_UPDATED': 'user.role.updated',
    'USER_DELETED': 'user.deleted'
  };

  return topicMap[eventType] || 'user.unknown';
};

/**
 * Start consuming messages
 */
const startConsumer = async () => {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const eventData = JSON.parse(message.value.toString());
          
          logger.info('Received Kafka message:', {
            topic,
            partition,
            eventType: eventData.eventType,
            service: eventData.service
          });

          await handleKafkaMessage(topic, eventData);
        } catch (error) {
          logger.error('Error processing Kafka message:', {
            topic,
            partition,
            error: error.message
          });
        }
      }
    });
  } catch (error) {
    logger.error('Error starting Kafka consumer:', error);
  }
};

/**
 * Handle incoming Kafka messages
 */
const handleKafkaMessage = async (topic, eventData) => {
  switch (topic) {
    case 'user.profile.update.request':
      await handleUserProfileUpdateRequest(eventData);
      break;
    
    case 'user.verification.request':
      await handleUserVerificationRequest(eventData);
      break;
    
    case 'user.status.change.request':
      await handleUserStatusChangeRequest(eventData);
      break;
    
    default:
      logger.warn('Unhandled topic:', topic);
  }
};

/**
 * Handle user profile update requests
 */
const handleUserProfileUpdateRequest = async (eventData) => {
  try {
    // Handle external requests to update user profile
    // This might come from other services needing user data updates
    logger.info('Processing user profile update request:', eventData.data);
    
    // Implementation would update user profile based on external service request
    // For now, just log the event
  } catch (error) {
    logger.error('Error handling user profile update request:', error);
  }
};

/**
 * Handle user verification requests
 */
const handleUserVerificationRequest = async (eventData) => {
  try {
    // Handle verification requests from other services
    logger.info('Processing user verification request:', eventData.data);
    
    // Implementation would handle verification logic
  } catch (error) {
    logger.error('Error handling user verification request:', error);
  }
};

/**
 * Handle user status change requests
 */
const handleUserStatusChangeRequest = async (eventData) => {
  try {
    // Handle status change requests from other services
    logger.info('Processing user status change request:', eventData.data);
    
    // Implementation would handle status changes
  } catch (error) {
    logger.error('Error handling user status change request:', error);
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
    
    logger.info('Kafka connections closed');
  } catch (error) {
    logger.error('Error shutting down Kafka:', error);
  }
};

module.exports = {
  initializeKafka,
  publishUserEvent,
  startConsumer,
  shutdown
};
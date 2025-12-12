const { Kafka } = require('kafkajs');
const logger = require('./logger');
const config = require('../config');


// kafka client configuration
const kafka = new Kafka({
    clientId: config.serviceName,
    brokers: process.env.KAFKA_BROKERS? process.env.KAFKA_BROKERS.split(',') :
     ['localhost:9092'],
     retry: {
        initialRetryTime: 100,
        retries: 8
     }
});

// create producer
const producer = kafka.producer();

// Event types

const EVENT_TYPES = {
    PATIENT_CREATED: 'PATIENT_CREATED',
    PATIENT_UPDATED: 'PATIENT_UPDATED',
    PATIENT_DELETED: 'PATIENT_DELETED',
    MEDICAL_HISTORY_ADDED: 'MEDICAL_HISTORY_ADDED',
    ALLERGY_ADDED: 'ALLERGY_ADDED',
    MEDICATION_ADDED: 'MEDICATION_ADDED',
};

/**
 * Initialize Kafka producer
 */
const initializeProducer = async () => {
    try {
        await producer.connect();
        logger.info('Kafka producer connected');
    } catch (error) {
        logger.error('Failed to connect Kafka producer: ', error.message);
    }

    // Dont fail service setup if kafka is unavailable
    // server can still function without event publishing
}

/**
 * Publish event to Kafka
 * @param { String} eventType - type of the event
 * @param { Object} eventData - data associated with the event
 */
const publishEvent = async (eventType, eventData) => {
    try {
        if(!producer) {
            logger.warn('Kafka producer not initialized, skipping event publish');
            return;
        }

        const event = {
            type: eventType,
            service: config.serviceName,
            timestamp: new Date().toISOString(),
            data: eventData,
        }
        await producer.send({
            topic: 'test-topic',
            messages: [
                {
                    key: eventData.patientId || eventData.id || 'unknown',
                    value: JSON.stringify(event),
                    headers: {
                        eventType: eventType,
                        service: config.serviceName,
                    }
                }
            ]
        });

        logger.info(`Published event ${eventType} to Kafka`);
    } catch (error) {
        logger.error(`Failed to publish event ${eventType} to Kafka: `, error.message);
    }
}

/**
 * Shutdown Kafka producer
 */
const shutdownProducer = async () => {
    try {
        await producer.disconnect();
        logger.info('Kafka producer disconnected');
    } catch (error) {
        logger.error('Failed to disconnect Kafka producer: ', error.message);
    }
}

module.exports = {
    initializeProducer,
    publishEvent,
    shutdownProducer,
    EVENT_TYPES,
};
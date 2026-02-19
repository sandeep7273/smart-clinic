/**
 * Database Configuration
 * MongoDB connection setup using Mongoose
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger.util');
const config = require('./env');

/**
 * Connect to MongoDB
 */
async function connectDatabase() {
  try {
    const mongoUri = config.isTest() ? config.mongodb.testUri : config.mongodb.uri;

    await mongoose.connect(mongoUri, {
      // Remove deprecated options, use only supported ones
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected successfully', {
        database: mongoose.connection.name,
        host: mongoose.connection.host,
    });
    logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDatabase() {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
};

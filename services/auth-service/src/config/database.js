/**
 * Database Configuration
 * MongoDB connection setup using Mongoose
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger.util');
const config = require('./env');

/**
 * Connect to MongoDB with retry (handles transient DNS/network issues in ECS)
 */
async function connectDatabase(retries = 5, delay = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const mongoUri = config.isTest() ? config.mongodb.testUri : config.mongodb.uri;

      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      logger.info('MongoDB connected successfully', {
          database: mongoose.connection.name,
          host: mongoose.connection.host,
      });
      logger.info(`✅ MongoDB connected: ${mongoose.connection.host}`);

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting to reconnect...');
      });
      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed due to app termination');
        process.exit(0);
      });
      return; // success
    } catch (error) {
      logger.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt < retries) {
        logger.info(`Retrying in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        logger.error('All MongoDB connection attempts failed. Exiting.');
        process.exit(1);
      }
    }
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

/**
 * MongoDB Database Connection
 */

const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

const connectDB = async (retries = 5, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 10000,
      });
      logger.info('MongoDB connected successfully', {
        database: mongoose.connection.name,
        host: mongoose.connection.host,
      });
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error', { error: err.message });
      });
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });
      return;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt}/${retries} failed`, {
        error: error.message,
        uri: config.mongodbUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
      });
      if (attempt < retries) {
        logger.info(`Retrying in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        process.exit(1);
      }
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;

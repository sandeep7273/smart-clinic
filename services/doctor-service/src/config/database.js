/**
 * MongoDB Database Connection
 */

const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
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

  } catch (error) {
    logger.error('MongoDB connection failed', {
      error: error.message,
      uri: config.mongodbUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // Hide credentials
    });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;

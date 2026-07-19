/**
 * Database Configuration
 * MongoDB connection setup
 */

const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, config.mongoOptions);

    logger.info(`MongoDB Connected: ${conn.connection.host}`, {
      database: conn.connection.name,
      host: conn.connection.host,
    });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };

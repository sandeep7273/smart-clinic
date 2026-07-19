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
const connectDB = async (retries = 5, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 10000,
      });
      logger.info(`MongoDB Connected: ${conn.connection.host}`, {
        database: conn.connection.name,
        host: conn.connection.host,
      });
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });
      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      });
      return conn;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt}/${retries} failed:`, error.message);
      if (attempt < retries) {
        logger.info(`Retrying in ${delay / 1000}s...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        process.exit(1);
      }
    }
  }
};

module.exports = { connectDB };

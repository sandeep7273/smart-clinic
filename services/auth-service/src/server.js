/**
 * Server Entry Point
 * Starts the Express server and connects to MongoDB
 */

const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger.util');
const { connectDatabase, disconnectDatabase } = require('./config/database');

const PORT = config.app.port;

/**
 * Start Server
 */
async function startServer() {
  try {
    // Validate configuration
    config.validateConfig();
    logger.info('Configuration validated successfully');

    // Connect to MongoDB
    await connectDatabase();

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Auth Service running on port ${PORT}`);
      logger.info(`📍 Environment: ${config.app.env}`);
      logger.info(`🗄️  MongoDB: Connected`);
      logger.info(`🔐 CORS Origin: ${config.cors.origin}`);
      logger.info(`⏱️  Access Token Expiry: ${config.jwt.accessTokenExpiry}`);
      logger.info(`⏱️  Refresh Token Expiry: ${config.jwt.refreshTokenExpiry}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectDatabase();
          logger.info('MongoDB connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

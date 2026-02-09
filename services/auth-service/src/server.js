/**
 * Server Entry Point
 * Starts the Express server with GraphQL and Kafka integration
 */

const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger.util');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { createApolloServer } = require('./graphql/server');
const { 
  initializeProducer, 
  initializeConsumer, 
  shutdown: shutdownKafka 
} = require('./kafka');

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

    // Initialize Kafka
    let kafkaInitialized = false;
    try {
      await initializeProducer();
      await initializeConsumer();
      kafkaInitialized = true;
      logger.info('✅ Kafka initialized successfully');
    } catch (error) {
      logger.warn('⚠️ Kafka initialization failed, continuing without event streaming:', error.message);
    }

    // Initialize GraphQL server
    const apolloServer = createApolloServer();
    await apolloServer.start();
    apolloServer.applyMiddleware({ 
      app, 
      path: '/graphql',
      cors: {
        origin: config.cors.origin.split(','),
        credentials: config.cors.credentials
      }
    });

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Auth Service running on port ${PORT}`);
      logger.info(`📍 Environment: ${config.app.env}`);
      logger.info(`🗄️  MongoDB: Connected`);
      logger.info(`🔐 CORS Origin: ${config.cors.origin}`);
      logger.info(`⏱️  Access Token Expiry: ${config.jwt.accessTokenExpiry}`);
      logger.info(`⏱️  Refresh Token Expiry: ${config.jwt.refreshTokenExpiry}`);
      logger.info(`🌐 GraphQL Playground: http://localhost:${PORT}${apolloServer.graphqlPath}`);
      if (kafkaInitialized) {
        logger.info(`📡 Kafka: Connected and consuming events`);
      }
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

      // Stop Apollo Server
      await apolloServer.stop();
      logger.info('GraphQL server stopped');

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Shutdown Kafka connections
          if (kafkaInitialized) {
            await shutdownKafka();
            logger.info('Kafka connections closed');
          }

          await disconnectDatabase();
          logger.info('MongoDB connection closed');
          
          logger.info('✅ Graceful shutdown completed');
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

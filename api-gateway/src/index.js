/**
 * API Gateway Server
 * Main entry point for the API Gateway
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { ApolloServer } = require('apollo-server-express');
const config = require('./config');
const logger = require('./utils/logger');
const correlationIdMiddleware = require('./middleware/correlationId.middleware');
const requestLogger = require('./middleware/logging.middleware');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const { graphqlRateLimiter } = require('./middleware/rateLimiter.middleware');
const healthRoutes = require('./routes/health.routes');
const proxyRoutes = require('./routes/proxy.routes');
const { createContext } = require('./graphql/context');
const { stitchRemoteSchemas } = require('./graphql/stitchSchemas');
const { createServiceClients } = require('./services/serviceClient');

// Initialize Express app
const app = express();

/**
 * Security Middleware
 */
app.use(helmet({
  contentSecurityPolicy: config.app.env === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: config.cors.origin.split(','),
  credentials: config.cors.credentials,
}));

/**
 * Performance Middleware
 */
app.use(compression());

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Custom Middleware
 */
app.use(correlationIdMiddleware);
app.use(requestLogger);

/**
 * Health Check Routes
 */
app.use('/', healthRoutes);

/**
 * REST API Proxy Routes
 */
app.use('/api', proxyRoutes);

/**
 * Initialize Apollo Server for GraphQL
 */
const initializeApolloServer = async () => {
  try {
    logger.info('Initializing Apollo Server...');
    
    // Stitch remote schemas
    const schema = await stitchRemoteSchemas(config);
    
    if (!schema) {
      logger.warn('No GraphQL schema available. GraphQL endpoint will not be available.');
      return null;
    }
    
    // Create Apollo Server
    const apolloServer = new ApolloServer({
      schema,
      context: createContext,
      introspection: config.app.env !== 'production', // Enable in dev
      playground: config.app.env !== 'production', // Enable in dev
      formatError: (error) => {
        logger.error('GraphQL error', {
          message: error.message,
          path: error.path,
          extensions: error.extensions,
        });
        
        // Hide internal errors in production
        if (config.app.env === 'production') {
          return {
            message: error.extensions?.code === 'INTERNAL_SERVER_ERROR'
              ? 'An internal error occurred'
              : error.message,
            extensions: {
              code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
            },
          };
        }
        
        return error;
      },
      plugins: [
        {
          async requestDidStart() {
            return {
              async didEncounterErrors(requestContext) {
                logger.error('GraphQL request errors', {
                  correlationId: requestContext.context.correlationId,
                  errors: requestContext.errors.map(e => ({
                    message: e.message,
                    path: e.path,
                  })),
                });
              },
            };
          },
        },
      ],
    });
    
    // Start Apollo Server
    await apolloServer.start();
    
    // Apply middleware to Express app
    apolloServer.applyMiddleware({
      app,
      path: '/graphql',
      cors: false, // Already handled by Express
    });
    
    logger.info(`GraphQL endpoint available at /graphql`);
    
    return apolloServer;
  } catch (error) {
    logger.error('Failed to initialize Apollo Server', {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
};

/**
 * Error Handling Middleware
 */
app.use(notFound);
app.use(errorHandler);

/**
 * Start Server
 */
const startServer = async () => {
  try {
    // Initialize service clients
    const serviceClients = createServiceClients();
    logger.info('Service clients initialized');
    
    // Initialize Apollo Server
    const apolloServer = await initializeApolloServer();
    
    // Start Express server
    const server = app.listen(config.app.port, () => {
      logger.info(`API Gateway started successfully`, {
        port: config.app.port,
        environment: config.app.env,
        nodeVersion: process.version,
        graphqlEnabled: !!apolloServer,
      });
      
      logger.info('Available endpoints:');
      logger.info(`  - Health: http://localhost:${config.app.port}/health`);
      logger.info(`  - Ready: http://localhost:${config.app.port}/ready`);
      logger.info(`  - Status: http://localhost:${config.app.port}/status`);
      if (apolloServer) {
        logger.info(`  - GraphQL: http://localhost:${config.app.port}/graphql`);
      }
      logger.info(`  - REST API: http://localhost:${config.app.port}/api/*`);
    });
    
    /**
     * Graceful Shutdown
     */
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Stop Apollo Server
        if (apolloServer) {
          await apolloServer.stop();
          logger.info('Apollo Server stopped');
        }
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    /**
     * Handle Uncaught Errors
     */
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', {
        reason,
        promise,
      });
      process.exit(1);
    });
    
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;

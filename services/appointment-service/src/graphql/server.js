/**
 * GraphQL Server Setup for Appointment Service
 * Configures Apollo Server with SAGA, CQRS, and Event Sourcing support
 */

const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');
const logger = require('../utils/logger');
const createContext = require('./context');

/**
 * Create GraphQL context
 */
// const createContext = async ({ req }) => {
//   // Extract user from request headers (forwarded from API Gateway)
//   // const user = req.user || {
//   //   userId: req.headers['x-user-id'],
//   //   email: req.headers['x-user-email'],
//   //   role: req.headers['x-user-role'],
//   //   tenantId: req.headers['x-tenant-id']
//   // };
  
//   const token = req.headers.authorization?.replace('Bearer ', '') || null;
//   const decoded = await validateToken(token);
//       const user = {
//         userId: decoded.id,
//         email: decoded.email,
//         roles: decoded.roles || [],
//       };
//   // Extract request metadata for SAGA and Event Sourcing
//   const correlationId = req.headers['x-correlation-id'] || 
//                        req.headers['x-request-id'] || 
//                        `appt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
//   const causationId = req.headers['x-causation-id'] || null;
  
//   return {
//     user: user.userId ? user : null,
//     token,
//     correlationId,
//     causationId,
//     userAgent: req.headers['user-agent'],
//     ip: req.ip || req.connection.remoteAddress,
//     requestId: req.id,
//     timestamp: new Date().toISOString()
//   };
// };

/**
 * Create Apollo Server instance with Event Sourcing and SAGA support
 */
const createApolloServer = () => {
  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  // Create Apollo Server with enhanced configuration
  const server = new ApolloServer({
    schema,
    context: createContext,
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production' ? {
      settings: {
        'editor.theme': 'dark',
        'editor.fontSize': 14,
        'editor.fontFamily': '"Source Code Pro", "Consolas", "Inconsolata", "Droid Sans Mono", "Monaco", monospace',
        'request.credentials': 'include'
      }
    } : false,
    
    // Enhanced error formatting for SAGA and Event Sourcing
    formatError: (error) => {
      // Log error with context
      logger.error('GraphQL Error:', {
        message: error.message,
        path: error.path,
        source: error.source?.body,
        positions: error.positions,
        extensions: error.extensions,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });

      // Determine error type and format accordingly
      const errorCode = error.extensions?.code || 'INTERNAL_ERROR';
      let formattedError = {
        message: error.message,
        extensions: {
          code: errorCode,
          timestamp: new Date().toISOString()
        }
      };

      // Add path information
      if (error.path) {
        formattedError.path = error.path;
      }

      // Add validation errors for input validation
      if (error.extensions?.validationErrors) {
        formattedError.extensions.validationErrors = error.extensions.validationErrors;
      }

      // Add SAGA-specific error information
      if (error.extensions?.sagaId) {
        formattedError.extensions.sagaId = error.extensions.sagaId;
        formattedError.extensions.sagaStep = error.extensions.sagaStep;
      }

      // Add event sourcing information
      if (error.extensions?.eventId) {
        formattedError.extensions.eventId = error.extensions.eventId;
        formattedError.extensions.aggregateId = error.extensions.aggregateId;
        formattedError.extensions.version = error.extensions.version;
      }

      // Include stack trace in development
      if (process.env.NODE_ENV === 'development') {
        formattedError.extensions.exception = {
          stacktrace: error.extensions?.exception?.stacktrace || error.stack?.split('\n')
        };
      }

      return formattedError;
    },

    // Enhanced response formatting with SAGA and Event Sourcing metadata
    formatResponse: (response, { request, context }) => {
      // Log request/response for audit trail
      logger.debug('GraphQL Response:', {
        correlationId: context.correlationId,
        causationId: context.causationId,
        operation: request.operationName,
        variables: request.variables,
        hasErrors: !!response.errors,
        userId: context.user?.userId,
        userRole: context.user?.role,
        timestamp: context.timestamp
      });

      // Add metadata to response
      if (!response.extensions) {
        response.extensions = {};
      }

      response.extensions.requestId = context.correlationId;
      response.extensions.timestamp = new Date().toISOString();

      // Add performance metrics
      const responseTime = Date.now() - new Date(context.timestamp).getTime();
      response.extensions.responseTime = responseTime;

      return response;
    },

    // Plugin configuration for additional functionality
    plugins: [
      // Request logging plugin
      {
        requestDidStart() {
          return {
            didResolveOperation(requestContext) {
              logger.info('GraphQL Operation:', {
                operation: requestContext.request.operationName,
                query: requestContext.request.query,
                variables: requestContext.request.variables,
                correlationId: requestContext.context.correlationId,
                userId: requestContext.context.user?.userId
              });
            },

            didEncounterErrors(requestContext) {
              logger.error('GraphQL Operation Errors:', {
                operation: requestContext.request.operationName,
                errors: requestContext.errors.map(error => ({
                  message: error.message,
                  path: error.path,
                  extensions: error.extensions
                })),
                correlationId: requestContext.context.correlationId,
                userId: requestContext.context.user?.userId
              });
            }
          };
        }
      },

      // Performance monitoring plugin
      {
        requestDidStart() {
          return {
            willSendResponse(requestContext) {
              const duration = Date.now() - new Date(requestContext.context.timestamp).getTime();
              
              if (duration > 1000) { // Log slow queries
                logger.warn('Slow GraphQL Query:', {
                  operation: requestContext.request.operationName,
                  duration,
                  correlationId: requestContext.context.correlationId,
                  userId: requestContext.context.user?.userId
                });
              }
            }
          };
        }
      }
    ]
  });

  return server;
};

/**
 * Health check for GraphQL server
 */
const healthCheck = () => {
  return {
    status: 'healthy',
    service: 'appointment-graphql',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    capabilities: [
      'appointments',
      'saga-pattern',
      'event-sourcing',
      'cqrs',
      'real-time-subscriptions'
    ]
  };
};

module.exports = {
  createApolloServer,
  createContext,
  healthCheck
};
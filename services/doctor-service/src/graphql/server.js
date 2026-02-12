/**
 * GraphQL Server Setup for Doctor Service
 * Configures Apollo Server and integrates with Express
 */

const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');
const logger = require('../utils/logger');
const createContext = require('./context');
// /**
//  * Create GraphQL context
//  */
// const createContext = ({ req }) => {
//   // Extract user from request headers (forwarded from API Gateway)
//   const user = req.user || {
//     userId: req.headers['x-user-id'],
//     email: req.headers['x-user-email'],
//     role: req.headers['x-user-role'],
//     tenantId: req.headers['x-tenant-id']
//   };
  
//   const token = req.headers.authorization?.replace('Bearer ', '') || null;
  
//   return {
//     user: user.userId ? user : null,
//     token,
//     correlationId: req.headers['x-correlation-id'] || req.id,
//     userAgent: req.headers['user-agent'],
//     ip: req.ip || req.connection.remoteAddress
//   };
// };

/**
 * Create Apollo Server instance
 */
const createApolloServer = () => {
  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    context: createContext,
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production',
    formatError: (error) => {
      logger.error('GraphQL Error:', {
        message: error.message,
        path: error.path,
        source: error.source?.body,
        positions: error.positions,
        extensions: error.extensions
      });

      // Return formatted error
      return {
        message: error.message,
        extensions: {
          code: error.extensions?.code || 'INTERNAL_ERROR',
          exception: process.env.NODE_ENV === 'development' ? {
            stacktrace: error.extensions?.exception?.stacktrace
          } : undefined
        }
      };
    },
    formatResponse: (response, { request, context }) => {
      logger.debug('GraphQL Response:', {
        correlationId: context.correlationId,
        operation: request.operationName,
        variables: request.variables,
        hasErrors: !!response.errors
      });

      return response;
    }
  });

  return server;
};

module.exports = {
  createApolloServer,
  createContext
};
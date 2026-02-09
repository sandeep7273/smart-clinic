/**
 * GraphQL Server Setup for Auth Service
 * Configures Apollo Server and integrates with Express
 */

const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');
const logger = require('../utils/logger.util');

/**
 * Create GraphQL context
 */
const createContext = ({ req }) => {
  // Extract user from request (set by auth middleware)
  const user = req.user || null;
  const token = req.headers.authorization?.replace('Bearer ', '') || null;
  
  return {
    user,
    token,
    correlationId: req.headers['x-correlation-id'] || req.id,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress
  };
};

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
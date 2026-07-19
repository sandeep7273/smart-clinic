/**
 * GraphQL Base Resolvers
 * Provides base resolvers for the gateway
 */

const logger = require('../utils/logger');

/**
 * Create base resolvers
 * @param {Object} serviceClients - Service clients for making API calls
 */
const createResolvers = (serviceClients) => {
  return {
    Query: {
      _empty: () => null,
      
      /**
       * Gateway health check
       */
      gatewayHealth: () => ({
        healthy: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      }),
    },
    
    Mutation: {
      _empty: () => null,
    },
    
    Subscription: {
      _empty: {
        subscribe: () => null,
      },
    },
  };
};

module.exports = { createResolvers };

/**
 * GraphQL Schema Stitching
 * Stitches remote GraphQL schemas from microservices
 */

const { introspectSchema, wrapSchema } = require('@graphql-tools/wrap');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { print } = require('graphql');
const fetch = require('cross-fetch');
const logger = require('../utils/logger');

/**
 * Create executor for remote GraphQL service
 * @param {string} serviceUrl - URL of the GraphQL service
 */
const createExecutor = (serviceUrl) => {
  return async ({ document, variables, context }) => {
    const query = print(document);
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'x-correlation-id': context.correlationId,
    };
    
    // Forward user info if available
    if (context.user) {
      headers['x-user-id'] = context.user.userId;
      headers['x-user-email'] = context.user.email;
      headers['x-user-role'] = context.user.role;
      if (context.user.tenantId) {
        headers['x-tenant-id'] = context.user.tenantId;
      }
    }
    
    try {
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
      });
      
      return await response.json();
    } catch (error) {
      logger.error('GraphQL executor error', {
        correlationId: context.correlationId,
        serviceUrl,
        error: error.message,
      });
      
      throw new Error(`Failed to execute GraphQL query on ${serviceUrl}: ${error.message}`);
    }
  };
};

/**
 * Stitch remote schemas
 * @param {Object} config - Configuration with service URLs
 */
const stitchRemoteSchemas = async (config) => {
  const subschemas = [];
  
  // List of services that expose GraphQL endpoints
  const graphqlServices = [
    { name: 'auth', url: `${config.services.auth}/graphql` },
    { name: 'patient', url: `${config.services.patient}/graphql` },
    { name: 'doctor', url: `${config.services.doctor}/graphql` },
    { name: 'appointment', url: `${config.services.appointment}/graphql` },
    { name: 'notification', url: `${config.services.notification}/graphql` },
    { name: 'search', url: `${config.services.search}/graphql` },
  ];
  
  // Introspect and add each service schema
  for (const service of graphqlServices) {
    try {
      const executor = createExecutor(service.url);
      
      // Introspect the remote schema
      const schema = await introspectSchema(executor);
      
      subschemas.push({
        schema,
        executor,
        batch: true, // Enable batching for better performance
      });
      
      logger.info(`Successfully stitched ${service.name} service schema`, {
        serviceUrl: service.url,
      });
    } catch (error) {
      // Log error but continue with other services
      logger.warn(`Failed to stitch ${service.name} service schema`, {
        serviceUrl: service.url,
        error: error.message,
      });
    }
  }
  
  // If no subschemas available, return null
  if (subschemas.length === 0) {
    logger.warn('No remote schemas available for stitching');
    return null;
  }
  
  // Stitch all schemas together
  const stitchedSchema = stitchSchemas({
    subschemas,
  });
  
  logger.info(`Successfully stitched ${subschemas.length} remote schemas`);
  
  return stitchedSchema;
};

module.exports = {
  createExecutor,
  stitchRemoteSchemas,
};

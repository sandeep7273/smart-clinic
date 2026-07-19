/**
 * Doctor Service GraphQL Proxy
 * Proxies GraphQL queries/mutations to doctor-service
 */

const { wrapSchema } = require('@graphql-tools/wrap');
const { print, buildClientSchema, getIntrospectionQuery } = require('graphql');
const fetch = require('cross-fetch');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Create executor for doctor service GraphQL endpoint
 */
const createDoctorServiceExecutor = () => {
  const serviceUrl = `${config.services.doctor}/graphql`;
  
  return async ({ document, variables, context }) => {
    const query = print(document);
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-correlation-id': context.correlationId || 'unknown',
      };
      
      // Forward authentication token if available
      if (context.token) {
        headers['Authorization'] = `Bearer ${context.token}`;
      }
      
      // Forward user context headers
      if (context.user) {
        headers['x-user-id'] = context.user.userId || context.user.id;
        headers['x-user-email'] = context.user.email;
        headers['x-user-role'] = context.user.role;
        if (context.user.tenantId) {
          headers['x-tenant-id'] = context.user.tenantId;
        }
      }
      
      logger.debug('Executing GraphQL query on doctor-service', {
        correlationId: context.correlationId,
        operationName: document.definitions[0]?.name?.value,
        hasAuth: !!context.token,
      });
      
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          query, 
          variables,
          operationName: document.definitions[0]?.name?.value
        }),
      });
      
      const result = await response.json();
      
      if (result.errors) {
        logger.error('Doctor service GraphQL errors', {
          correlationId: context.correlationId,
          errors: result.errors,
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to execute GraphQL query on doctor-service', {
        correlationId: context.correlationId,
        error: error.message,
        stack: error.stack,
      });
      
      throw new Error(`Doctor service unavailable: ${error.message}`);
    }
  };
};

/**
 * Create wrapped schema for doctor service
 */
const createDoctorServiceSchema = async () => {
  try {
    const executor = createDoctorServiceExecutor();
    const serviceUrl = `${config.services.doctor}/graphql`;
    
    logger.info('Introspecting doctor-service GraphQL schema...');
    
    // Manually introspect the schema
    const introspectionQuery = getIntrospectionQuery();
    const introspectionResult = await fetch(serviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: introspectionQuery }),
    });
    
    const responseData = await introspectionResult.json();
    
    if (!responseData || !responseData.data) {
      throw new Error(`Invalid introspection response: ${JSON.stringify(responseData)}`);
    }
    
    const schema = buildClientSchema(responseData.data);
    
    // Wrap the schema with executor
    const wrappedSchema = wrapSchema({
      schema,
      executor,
    });
    
    logger.info('Doctor-service GraphQL schema loaded successfully');
    
    return wrappedSchema;
  } catch (error) {
    logger.error('Failed to load doctor-service GraphQL schema', {
      error: error.message,
      stack: error.stack,
    });
    
    return null;
  }
};

/**
 * Check if doctor service is available
 */
const checkDoctorServiceAvailability = async () => {
  try {
    const serviceUrl = `${config.services.doctor}/graphql`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(serviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    logger.warn('Doctor service is not available', {
      error: error.message,
    });
    return false;
  }
};

module.exports = {
  createDoctorServiceSchema,
  createDoctorServiceExecutor,
  checkDoctorServiceAvailability,
};

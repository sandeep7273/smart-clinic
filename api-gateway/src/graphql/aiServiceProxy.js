/**
 * AI Service GraphQL Proxy
 * Proxies GraphQL queries/mutations to ai-service
 */

const { wrapSchema } = require('@graphql-tools/wrap');
const { print, buildClientSchema, getIntrospectionQuery } = require('graphql');
const fetch = require('cross-fetch');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Create executor for AI service GraphQL endpoint
 */
const createAIServiceExecutor = () => {
  const serviceUrl = `${config.services.ai}/graphql`;
  
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
      
      logger.debug('Executing GraphQL query on ai-service', {
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
        logger.error('AI service GraphQL errors', {
          correlationId: context.correlationId,
          errors: result.errors,
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Failed to execute GraphQL query on ai-service', {
        correlationId: context.correlationId,
        error: error.message,
        stack: error.stack,
      });
      
      throw new Error(`AI service unavailable: ${error.message}`);
    }
  };
};

/**
 * Create wrapped schema for AI service
 */
const createAIServiceSchema = async () => {
  try {
    const executor = createAIServiceExecutor();
    const serviceUrl = `${config.services.ai}/graphql`;
    
    logger.info('Introspecting ai-service GraphQL schema...');
    
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
    
    logger.info('✅ AI service schema introspected successfully');
    
    // Wrap the schema with the executor
    const wrappedSchema = wrapSchema({
      schema,
      executor,
    });
    
    return wrappedSchema;
  } catch (error) {
    logger.error('Failed to create AI service schema', {
      error: error.message,
      stack: error.stack,
    });
    
    return null;
  }
};

/**
 * Check if AI service is available
 */
const checkAIServiceAvailability = async () => {
  try {
    const serviceUrl = `${config.services.ai}/health`;
    
    logger.info(`Checking AI service availability at ${serviceUrl}...`);
    
    const response = await fetch(serviceUrl, {
      method: 'GET',
      timeout: 5000, // 5 second timeout
    });
    
    if (!response.ok) {
      logger.warn(`AI service health check failed: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    logger.info('✅ AI service is available', data);
    
    return true;
  } catch (error) {
    logger.warn(`AI service not available: ${error.message}`);
    return false;
  }
};

module.exports = {
  createAIServiceSchema,
  checkAIServiceAvailability,
};

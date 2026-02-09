/**
 * Simplified GraphQL Schema Stitching
 * For testing basic federation without complications
 */

const { print } = require('graphql');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const fetch = require('cross-fetch');
const logger = require('../utils/logger');

/**
 * Create executor for remote GraphQL service
 */
const createExecutor = (serviceUrl) => {
  return async ({ document, variables, context }) => {
    const query = print(document);
    
    try {
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': context.correlationId,
        },
        body: JSON.stringify({ query, variables }),
      });
      
      return await response.json();
    } catch (error) {
      logger.error('GraphQL executor error', {
        serviceUrl,
        error: error.message,
      });
      
      throw new Error(`Failed to execute GraphQL query on ${serviceUrl}: ${error.message}`);
    }
  };
};

/**
 * Create a simple federated schema manually
 */
const createSimpleFederatedSchema = async (config) => {
  const services = [
    { name: 'auth', url: `${config.services.auth}/graphql` },
    { name: 'doctor', url: `${config.services.doctor}/graphql` },
    { name: 'appointment', url: `${config.services.appointment}/graphql` },
  ];
  
  // Check which services are available
  const availableServices = [];
  for (const service of services) {
    try {
      const response = await fetch(service.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __typename }' }),
      });
      
      if (response.ok) {
        availableServices.push(service);
        logger.info(`Service ${service.name} is available`, {
          serviceUrl: service.url,
        });
      }
    } catch (error) {
      logger.warn(`Service ${service.name} is not available`, {
        serviceUrl: service.url,
        error: error.message,
      });
    }
  }
  
  if (availableServices.length === 0) {
    logger.warn('No services available for federation');
    return null;
  }
  
  // Create a simple federated schema
  const typeDefs = `
    type Query {
      # Health checks
      _health: String
      
      # Auth service queries
      authHello: String
      testAuth: String
      
      # Doctor service queries  
      doctorHello: String
      testDoctor: String
      
      # Appointment service queries
      appointmentHello: String
      testAppointment: String
    }
  `;
  
  const resolvers = {
    Query: {
      _health: () => 'Gateway is healthy',
      
      // Auth service resolvers
      authHello: async (parent, args, context) => {
        if (!availableServices.find(s => s.name === 'auth')) return 'Auth service not available';
        
        const executor = createExecutor(config.services.auth + '/graphql');
        const result = await executor({
          document: { kind: 'Document', definitions: [{ kind: 'OperationDefinition', operation: 'query', selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: 'Name', value: 'hello' } }] } }] },
          context
        });
        return result.data?.hello || 'No response';
      },
      
      testAuth: async (parent, args, context) => {
        if (!availableServices.find(s => s.name === 'auth')) return 'Auth service not available';
        
        const executor = createExecutor(config.services.auth + '/graphql');
        const result = await executor({
          document: { kind: 'Document', definitions: [{ kind: 'OperationDefinition', operation: 'query', selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: 'Name', value: 'testAuth' } }] } }] },
          context
        });
        return result.data?.testAuth || 'No response';
      },
      
      // Doctor service resolvers
      doctorHello: async (parent, args, context) => {
        if (!availableServices.find(s => s.name === 'doctor')) return 'Doctor service not available';
        
        const executor = createExecutor(config.services.doctor + '/graphql');
        const result = await executor({
          document: { kind: 'Document', definitions: [{ kind: 'OperationDefinition', operation: 'query', selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: 'Name', value: 'hello' } }] } }] },
          context
        });
        return result.data?.hello || 'No response';
      },
      
      testDoctor: async (parent, args, context) => {
        if (!availableServices.find(s => s.name === 'doctor')) return 'Doctor service not available';
        
        const executor = createExecutor(config.services.doctor + '/graphql');
        const result = await executor({
          document: { kind: 'Document', definitions: [{ kind: 'OperationDefinition', operation: 'query', selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: 'Name', value: 'testDoctor' } }] } }] },
          context
        });
        return result.data?.testDoctor || 'No response';
      },
      
      // Appointment service resolvers
      appointmentHello: async (parent, args, context) => {
        if (!availableServices.find(s => s.name === 'appointment')) return 'Appointment service not available';
        
        const executor = createExecutor(config.services.appointment + '/graphql');
        const result = await executor({
          document: { kind: 'Document', definitions: [{ kind: 'OperationDefinition', operation: 'query', selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: 'Name', value: 'hello' } }] } }] },
          context
        });
        return result.data?.hello || 'No response';
      },
      
      testAppointment: async (parent, args, context) => {
        if (!availableServices.find(s => s.name === 'appointment')) return 'Appointment service not available';
        
        const executor = createExecutor(config.services.appointment + '/graphql');
        const result = await executor({
          document: { kind: 'Document', definitions: [{ kind: 'OperationDefinition', operation: 'query', selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: 'Name', value: 'testAppointment' } }] } }] },
          context
        });
        return result.data?.testAppointment || 'No response';
      },
    }
  };
  
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });
  
  logger.info(`Created federated schema with ${availableServices.length} services`);
  return schema;
};

module.exports = {
  stitchRemoteSchemas: createSimpleFederatedSchema
};
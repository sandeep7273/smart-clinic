/**
 * Simplified GraphQL Schema Stitching
 * Proxies GraphQL requests to backend services
 */

const { stitchSchemas } = require('@graphql-tools/stitch');
const { print } = require('graphql');
const fetch = require('cross-fetch');
const logger = require('../utils/logger');
const { createDoctorServiceSchema, checkDoctorServiceAvailability } = require('./doctorServiceProxy');
const { createAppointmentServiceSchema, checkAppointmentServiceAvailability } = require('./appointmentServiceProxy');
const { createAIServiceSchema, checkAIServiceAvailability } = require('./aiServiceProxy');

/**
 * Wait for a service to become available with retries
 */
const waitForService = async (checkFn, serviceName, maxRetries = 10, delayMs = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    const available = await checkFn();
    if (available) {
      logger.info(`✅ ${serviceName} is ready (attempt ${i + 1}/${maxRetries})`);
      return true;
    }
    
    if (i < maxRetries - 1) {
      logger.info(`⏳ Waiting for ${serviceName} to be ready... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  logger.warn(`⚠️ ${serviceName} not available after ${maxRetries} attempts`);
  return false;
};

/**
 * Stitch remote schemas from microservices with retry logic
 */
const stitchRemoteSchemas = async (config) => {
  try {
    logger.info('Starting GraphQL schema stitching with service discovery...');
    
    const schemas = [];
    
    // Check and add doctor service schema with retries
    const doctorServiceAvailable = await waitForService(
      checkDoctorServiceAvailability,
      'Doctor Service',
      5,
      2000
    );
    
    if (doctorServiceAvailable) {
      const doctorSchema = await createDoctorServiceSchema();
      if (doctorSchema) {
        schemas.push({
          schema: doctorSchema,
          batch: true,
        });
        logger.info('✅ Doctor service GraphQL schema added to federation');
      }
    } else {
      logger.warn('⚠️ Doctor service GraphQL not available - skipping');
    }
    
    // Check and add appointment service schema with retries
    const appointmentServiceAvailable = await waitForService(
      checkAppointmentServiceAvailability,
      'Appointment Service',
      5,
      2000
    );
    
    if (appointmentServiceAvailable) {
      const appointmentSchema = await createAppointmentServiceSchema();
      if (appointmentSchema) {
        schemas.push({
          schema: appointmentSchema,
          batch: true,
        });
        logger.info('✅ Appointment service GraphQL schema added to federation');
      }
    } else {
      logger.warn('⚠️ Appointment service GraphQL not available - skipping');
    }
    
    // Check and add AI service schema with retries
    const aiServiceAvailable = await waitForService(
      checkAIServiceAvailability,
      'AI Service',
      5,
      2000
    );
    
    if (aiServiceAvailable) {
      const aiSchema = await createAIServiceSchema();
      if (aiSchema) {
        schemas.push({
          schema: aiSchema,
          batch: true,
        });
        logger.info('✅ AI service GraphQL schema added to federation');
      }
    } else {
      logger.warn('⚠️ AI service GraphQL not available - skipping');
    }
    
    // If no schemas available, return null
    if (schemas.length === 0) {
      logger.warn('No GraphQL services available for federation');
      return null;
    }
    
    // Stitch all available schemas
    const stitchedSchema = stitchSchemas({
      subschemas: schemas,
    });
    
    logger.info(`✅ GraphQL federation complete with ${schemas.length} service(s)`);
    
    return stitchedSchema;
  } catch (error) {
    logger.error('Failed to stitch GraphQL schemas', {
      error: error.message,
      stack: error.stack,
    });
    
    return null;
  }
};

module.exports = {
  stitchRemoteSchemas
};
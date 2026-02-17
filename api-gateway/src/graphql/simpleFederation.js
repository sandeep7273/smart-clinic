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
 * Stitch remote schemas from microservices
 */
const stitchRemoteSchemas = async (config) => {
  try {
    logger.info('Starting GraphQL schema stitching...');
    
    const schemas = [];
    
    // Check and add doctor service schema
    const doctorServiceAvailable = await checkDoctorServiceAvailability();
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
    
    // Check and add appointment service schema
    const appointmentServiceAvailable = await checkAppointmentServiceAvailability();
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
    
    // Check and add AI service schema
    const aiServiceAvailable = await checkAIServiceAvailability();
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
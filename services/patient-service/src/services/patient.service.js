const {Patient, PATIENT_STATUS } = require('../models/Patient');
const logger = require('../utils/logger');
const { ValidationError, ConflictError, NotFoundError } = require('../utils/errors');

/**
 * creates a new patient record
 * @param {Object} patientData - data for the new patient
 * @returns {Object} - the created patient record
 */

const createPatient = async (patientData) => {
    const { userId, email} = patientData;

    // Check if patient already exists with userId
    if (userId){
        const existingByUserId = await Patient.findByUserId(userId);
        if (existingByUserId) {
            throw new ConflictError(`Patient with userId ${userId} already exists.`);
        }
    }

    // check if patient already exists with email
    if (email) {
        const existingByEmail = await Patient.findByEmail(email);
        if (existingByEmail) {
            throw new ConflictError(`Patient with email ${email} already exists.`);
        }
    }

    const patient = new Patient({
        ...patientData,
        email: email ? email.toLowerCase() : undefined,
        status: PATIENT_STATUS.ACTIVE,
    });

  // save the new patient database
    await patient.save();
    logger.info(`Created new patient with ID: ${patient._id} and email: ${email}`);
    
    return patient;
}

/**
 * Get Patient by ID
 * @param {String} patientId - ID of the patient to retrieve
 * @returns {Object|null} - the patient record or null if not found
*/
const getPatientById = async (patientId) => {
    const patient = await Patient.findById(patientId);
    if(!patient) {
        throw new NotFoundError(`Patient with ID ${patientId} not found.`);
    }

    return patient;
}

/**
 * Get Patient by UserId
 * @param {String} userId - ID of the user to retrieve the patient for
 * @returns {Object|null} - the patient record or null if not found 
*/
const getPatientByUserId = async (userId) => {
    const patient = await Patient.findByUserId(userId);
    if(!patient) {
        throw new NotFoundError(`Patient with userId ${userId} not found.`);
    }

    return patient;
}

/**
 * Get Patient by Email
 * @param {String} email - email of the patient to retrieve
 * @returns {Object|null} - the patient record or null if not found 
*/
const getPatientByEmail = async (email) => {
    const patient = await Patient.findByEmail(email.toLowerCase());
    if(!patient) {
        throw new NotFoundError(`Patient with email ${email} not found.`);
    }

    return patient;
}

module.exports = {
    createPatient,
    getPatientById,
    getPatientByUserId,
    getPatientByEmail,
};
const {Patient, PATIENT_STATUS } = require('../models/Patient');
const logger = require('../utils/logger');
const { ValidationError, ConflictError, NotFoundError } = require('../utils/errors');
const PatientReadView = require('../models/PatientReadView');
const { publishEvent, EVENT_TYPES } = require('../utils/eventProducer');

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
    
    // update read view(CQRS)
    await PatientReadView.updateFromPatient(patient);
     await publishEvent(EVENT_TYPES.PATIENT_CREATED, {
        patientId: patient._id.toString(),
        email: patient.email,
        userId: patient.userId,
        firstName: patient.firstName,
        lastName: patient.lastName,
    });
    // return the created patient
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

/**
 * Get all patients with pagination and filters
 * @param { Object} filters - filter options
 * @param {Number} page - page number for pagination
 * @param {Number} limit - number of records per page
 * @returns {Object} - paginated list of patients
*/

const getAllPatients = async (filters = {}, page =1, limit = 10, useReadView = true) => {
    const query = {};

    // Apply filters to query
    if(filters.status) {
        query.status = filters.status;
    }
    if(filters.city) {
        query.city = new RegExp(filters.city, 'i');  // case-insensitive match
    }

    if(filters.search) {
        // convert all text sentences as string array
        // ignore language stop words
        // consider unique string
        // run running runner

        // use text search on read for better performance
        query.$text = { $search: filters.search };

        query.$or = [
            { firstName: new RegExp(filters.search, 'i') },
            { lastName: new RegExp(filters.search, 'i') },
            { email: new RegExp(filters.search, 'i') },
        ];

    }
        const skip = (page - 1) * limit;

        // use read-optimized view for better performance(CQRS)
        
        if(useReadView) {
            const [patients, total] = await Promise.all([
                PatientReadView.find(query)
                    .sort({ registrationDate: -1 }) // most recent first
                    .skip(skip)
                    .limit(limit),
                PatientReadView.countDocuments(query),
            ]);
            
            // fetch full patient data if needed (can be optimized further if required)
            const patientIds = patients.map(p => p.patientId);
            const fullPatients = await Patient.find({ _id: { $in: patientIds } });

            return {
                patients: fullPatients,
                pagination: {
                    page,
                    total,
                    limit,
                    pages: Math.ceil(total / limit),
                }
            }
        } else {
            const [patients, total] = await Promise.all([
                Patient.find(query)
                    .sort({ createdAt: -1 }) // most recent first
                    .skip(skip)
                    .limit(limit),
                Patient.countDocuments(query),
            ]);

            return {
                patients,
                pagination: {
                    page,
                    total,
                    limit,
                    pages: Math.ceil(total / limit),
                }
            }
        }
    
}
/**
 * Update patient details
 * @param {String} patientId - ID of the patient to update
 * @param {Object} updateData - data to update
 * @returns {Object} - updated patient record
*/
const updatePatient = async (patientId, updateDate) => {

    const patient = await Patient.findById(patientId);
    
    if(!patient) {
        throw new NotFoundError(`Patient with ID ${patientId} not found.`);
    }

    // handle email update separately to check for conflicts
    if(updateDate.email && updateDate.email.toLowerCase() !== patient.email) {
        const existingByEmail = await Patient.findByEmail(updateDate.email.toLowerCase());
        if(existingByEmail && existingByEmail._id.toString() !== patientId) {
            throw new ConflictError(`Patient with email ${updateDate.email} already exists.`);
        }
        patient.email = updateDate.email.toLowerCase();
    }
    Object.assign(patient, updateDate);
    
    await patient.save();
    logger.info(`Updated patient with ID: ${patient._id} (email: ${patient.email})`);

    // update read view(CQRS)
    await PatientReadView.updateFromPatient(patient);
    // publish PATIENT_UPDATED event
    await publishEvent(EVENT_TYPES.PATIENT_UPDATED, {
        patientId: patient._id.toString(),
        email: patient.email,
        userId: patient.userId,
        updatedFields: Object.keys(updateDate),
    });
    return patient;

 }

 /**
  * Delete patient (Soft delete by setting status to INACTIVE)
  * @param {String} patientId 
  */
const deletePatient = async (patientId) => {

    const patient = await Patient.findById(patientId);

    if(!patient) {
        throw new NotFoundError(`Patient with ID ${patientId} not found.`);
    }

    patient.status = PATIENT_STATUS.INACTIVE;
    await patient.save();
    logger.info(`patient Deleted with ID: ${patient._id} (email: ${patient.email}) Status set to INACTIVE`);
    
    // update read view(CQRS)
    await PatientReadView.updateFromPatient(patient);

    // publish PATIENT_DELETED event
    await publishEvent(EVENT_TYPES.PATIENT_DELETED, {
        patientId: patient._id.toString(),
        email: patient.email,
        userId: patient.userId,
    });
}

/** Add medical history item entry to patient
 * @param {String} patientId 
 * @param {Object} historyData 
 * @returns {Object} - updated patient record
 */
const addMedicalHistory = async (patientId, historyData) => {
    const patient = await Patient.findById(patientId);

    if(!patient) {
        throw new NotFoundError(`Patient with ID ${patientId} not found.`);
    }

    await patient.addMedicalHistoryItem(historyData);
    await patient.save();
    logger.info(`Added medical history item to patient ID: ${patient._id} (email: ${patient.email})`);

    // update read view(CQRS)
    await PatientReadView.updateFromPatient(patient);

    // publish MEDICAL_HISTORY_ADDED event
    await publishEvent(EVENT_TYPES.MEDICAL_HISTORY_ADDED, {
        patientId: patient._id.toString(),
        
        condition: historyData.condition,
        historyItem: historyData,
    });

    return patient;
}


/** Add allergy item to patient
 * @param {String} patientId 
 * @param {Object} allergyData 
 * @returns {Object} - updated patient record
 */
const addAllergy = async (patientId, allergyData) => {

    const patient = await Patient.findById(patientId);

    if(!patient) {
        throw new NotFoundError(`Patient with ID ${patientId} not found.`);
    }

    await patient.addAllergyItem(allergyData);
    await patient.save();
    logger.info(`Added allergy item to patient ID: ${patient._id} (email: ${patient.email})`);

    // update read view(CQRS)
    await PatientReadView.updateFromPatient(patient);

    // publish ALLERGY_ADDED event
    await publishEvent(EVENT_TYPES.ALLERGY_ADDED, {
        patientId: patient._id.toString(),
        allergy: allergyData.allergy,
        allergyItem: allergyData,
        sevirity: allergyData.severity,
    });

    return patient;

}

/** Add medication item to patient
 * @param {String} patientId 
 * @param {Object} medicationData 
 * @returns {Object} - updated patient record
 */
const addMedication = async (patientId, medicationData) => {
    const patient = await Patient.findById(patientId);
    
    if(!patient) {
        throw new NotFoundError(`Patient with ID ${patientId} not found.`);
    }
    await patient.addMedicationItem(medicationData);
    await patient.save();
    logger.info(`Added medication item to patient ID: ${patient._id} (email: ${patient.email})`);

    // update read view(CQRS)
    await PatientReadView.updateFromPatient(patient);

    // publish MEDICATION_ADDED event
    await publishEvent(EVENT_TYPES.MEDICATION_ADDED, {
        patientId: patient._id.toString(),
        medication: medicationData.medication,
        medicationItem: medicationData,
        dosage: medicationData.dosage,
    });
    return patient;
}

/**
 * Update Last visit date for patient
 * @param {String} patientId 
 * @Returns {Object} - updated patient record 
 */
const updateLastVisit = async (patientId) => {
    const patient = await Patient.findById(patientId);

    if(!patient) {
        throw new NotFoundError(`Patient with ID ${patientId} not found.`);
    }
    patient.lastVisitDate = new Date();
    await patient.save();
    logger.info(`Updated last visit date for patient ID: ${patient._id} (email: ${patient.email})`);

    // update read view(CQRS)
    await PatientReadView.updateFromPatient(patient);

    return patient;
}

module.exports = {
    createPatient,
    getPatientById,
    getPatientByUserId,
    getPatientByEmail,
    getAllPatients,
    updatePatient,
    deletePatient,
    addMedicalHistory,
    addAllergy,
    addMedication,
    updateLastVisit,
};
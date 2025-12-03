const patientService = require('../services/patient.service');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Create a new patient record.
 */
const createPatient = async (req, res, next) => {
  try {
    const patientData = req.body;
    // if userId not provide and user not authe
    if (!patientData.userId && !req.user) {
        patientData.userId = req.user.userId;
    }
    const patient = await patientService.createPatient(patientData);

    res.status(201).json({
        message: 'Patient record created successfully',
        succeess: true,
        data: patient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient by ID.
*/

const getPatientById = async (req, res, next) => {
  try{
    const {id} = req.params;
    const patient = await patientService.getPatientById(id);
    res.status(200).json({
        succeess: true,
        data: patient
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get patients by User ID.
 */

const getPatientsByUserId = async (req, res, next) => {
  try{
    const {userId} = req.params;
    const patients = await patientService.getPatientsByUserId(userId);
    res.status(200).json({
        succeess: true,
        data: patients
    });
  } catch (error) {
    next(error);
  }
}

/**
 * get current User's patients profile
*/


/**
 * get all patients with pagination
 * 
*/

const getAllPatients = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {
        status: req.query.status,
        city: req.query.city,
        search: req.query.search
    };

    const result = await patientService.getAllPatients(filters, page, limit);

    res.status(200).json({
        success: true,
        data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * update patient record
*/

/**
 * delete patient record
*/

/**
 * Add medical history item to patient
 */

module.exports = {
  createPatient,
  getPatientById,
  getPatientsByUserId,
  getAllPatients
};
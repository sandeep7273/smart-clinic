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


module.exports = {
  createPatient,
};
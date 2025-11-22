const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { validateCreatePatient, validateUpdatePatient } = require('../middlewares/validator.middleware');
const { authenticate } = require('../middlewares/authenticate.middleware');
const { requiredPatientOrClinicianRoles } = require ('../middlewares/rbac.middleware');

router
    .post('/', 
        authenticate,
        requiredPatientOrClinicianRoles,
        validateCreatePatient,
        patientController.createPatient
    );

module.exports = router; 
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateCreatePatient } = require('../middlewares/validator.middleware');
const { requiredPateintOrClinicianRole, requiredClinician } = require('../middlewares/rbac.middleware');

router
    .post('/',
         authenticate,
         requiredPateintOrClinicianRole,
         validateCreatePatient,
        patientController.createPatient);

router
    .get('/:id',
        authenticate,
        requiredPateintOrClinicianRole,
        patientController.getPatientById);

router
    .get('/user/:userId',
        authenticate,
        requiredClinician,
        patientController.getPatientsByUserId);

router
    .get('/',
        authenticate,
        requiredClinician,
        patientController.getAllPatients);

module.exports = router;
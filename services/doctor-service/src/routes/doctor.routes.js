const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole, requireOwnership } = require('../middlewares/rbac.middleware');
const {
  createDoctorValidation,
  updateDoctorValidation,
  searchDoctorValidation,
  addSlotValidation,
  updateSlotValidation,
  idValidation,
} = require('../middlewares/validator.middleware');

/**
 * Public routes
 */

// Get all doctors with pagination and sorting
router.get(
  '/',
  doctorController.getAllDoctors
);

// Search doctors with filters
router.get(
  '/search',
  searchDoctorValidation,
  doctorController.searchDoctors
);

// Get available doctors
router.get(
  '/available',
  searchDoctorValidation,
  doctorController.getAvailableDoctors
);

// Get filter options for dropdowns
router.get(
  '/filters/options',
  doctorController.getFilterOptions
);

// Get doctors by specialization
router.get(
  '/specialization/:specialization',
  searchDoctorValidation,
  doctorController.getDoctorsBySpecialization
);

// Get doctor by ID
router.get(
  '/:id',
  idValidation,
  doctorController.getDoctorById
);

// Get doctor statistics
router.get(
  '/:id/stats',
  idValidation,
  doctorController.getDoctorStats
);

/**
 * Protected routes - require authentication
 */

// Get current doctor's profile
router.get(
  '/me/profile',
  authenticate,
  requireRole('doctor'),
  doctorController.getMyProfile
);

// Create doctor profile
router.post(
  '/',
  authenticate,
  requireRole('doctor'),
  createDoctorValidation,
  doctorController.createDoctor
);

// Update doctor profile
router.put(
  '/:id',
  authenticate,
  requireRole('doctor', 'admin'),
  updateDoctorValidation,
  doctorController.updateDoctor
);

// Delete doctor profile
router.delete(
  '/:id',
  authenticate,
  requireRole('doctor', 'admin'),
  idValidation,
  doctorController.deleteDoctor
);

// Add availability slot
router.post(
  '/:id/slots',
  authenticate,
  requireRole('doctor', 'admin'),
  addSlotValidation,
  doctorController.addAvailabilitySlot
);

// Update slot status
router.patch(
  '/:id/slots/:slotId',
  authenticate,
  requireRole('doctor', 'admin'),
  updateSlotValidation,
  doctorController.updateSlotStatus
);

module.exports = router;

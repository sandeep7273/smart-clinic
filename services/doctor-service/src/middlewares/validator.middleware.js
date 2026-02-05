const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));
    throw new ValidationError('Validation failed', errorMessages);
  }
  next();
};

/**
 * Validation rules for creating a doctor
 */
const createDoctorValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('specializations').isArray({ min: 1 }).withMessage('At least one specialization required'),
  body('experience').isInt({ min: 0 }).withMessage('Experience must be a positive number'),
  body('consultationFee').isFloat({ min: 0 }).withMessage('Consultation fee must be a positive number'),
  body('address.street').trim().notEmpty().withMessage('Street address is required'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.state').trim().notEmpty().withMessage('State is required'),
  body('address.zipCode').trim().notEmpty().withMessage('Zip code is required'),
  body('address.country').trim().notEmpty().withMessage('Country is required'),
  handleValidationErrors,
];

/**
 * Validation rules for updating a doctor
 */
const updateDoctorValidation = [
  param('id').isMongoId().withMessage('Invalid doctor ID'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
  body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a positive number'),
  body('consultationFee').optional().isFloat({ min: 0 }).withMessage('Consultation fee must be positive'),
  handleValidationErrors,
];

/**
 * Validation rules for search
 */
const searchDoctorValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['rating', 'experience', 'consultationFee', 'firstName']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidationErrors,
];

/**
 * Validation rules for adding availability slot
 */
const addSlotValidation = [
  param('id').isMongoId().withMessage('Invalid doctor ID'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time required (HH:MM)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time required (HH:MM)'),
  handleValidationErrors,
];

/**
 * Validation rules for updating slot status
 */
const updateSlotValidation = [
  param('id').isMongoId().withMessage('Invalid doctor ID'),
  param('slotId').isMongoId().withMessage('Invalid slot ID'),
  body('status').isIn(['available', 'booked', 'cancelled', 'completed']).withMessage('Invalid slot status'),
  handleValidationErrors,
];

/**
 * Validation rules for MongoDB ObjectId
 */
const idValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  handleValidationErrors,
];

module.exports = {
  createDoctorValidation,
  updateDoctorValidation,
  searchDoctorValidation,
  addSlotValidation,
  updateSlotValidation,
  idValidation,
  handleValidationErrors,
};

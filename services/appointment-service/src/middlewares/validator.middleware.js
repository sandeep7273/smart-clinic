/**
 * Validation Middleware
 * Request validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    throw new ValidationError(errorMessages);
  }
  next();
};

/**
 * Create appointment validation
 */
const createAppointmentValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('doctorId').notEmpty().withMessage('Doctor ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('reason').notEmpty().withMessage('Reason is required'),
  body('duration').optional().isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15 and 180 minutes'),
  handleValidationErrors,
];

/**
 * Update appointment validation
 */
const updateAppointmentValidation = [
  param('id').isMongoId().withMessage('Valid appointment ID is required'),
  body('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).withMessage('Invalid status'),
  body('notes').optional().isString(),
  body('cancelReason').optional().isString(),
  handleValidationErrors,
];

/**
 * Cancel appointment validation
 */
const cancelAppointmentValidation = [
  param('id').isMongoId().withMessage('Valid appointment ID is required'),
  body('cancelReason').notEmpty().withMessage('Cancel reason is required'),
  handleValidationErrors,
];

/**
 * Reschedule appointment validation
 */
const rescheduleAppointmentValidation = [
  param('id').isMongoId().withMessage('Valid appointment ID is required'),
  body('newDate').isISO8601().withMessage('Valid new date is required'),
  body('newStartTime').notEmpty().withMessage('New start time is required'),
  body('newEndTime').notEmpty().withMessage('New end time is required'),
  handleValidationErrors,
];

/**
 * Search appointments validation
 */
const searchAppointmentsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).withMessage('Invalid status'),
  handleValidationErrors,
];

/**
 * ID validation
 */
const idValidation = [
  param('id').isMongoId().withMessage('Valid ID is required'),
  handleValidationErrors,
];

module.exports = {
  createAppointmentValidation,
  updateAppointmentValidation,
  cancelAppointmentValidation,
  rescheduleAppointmentValidation,
  searchAppointmentsValidation,
  idValidation,
};

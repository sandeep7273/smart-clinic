const { body, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Validation Middleware - validate request data
 */

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        throw new ValidationError( errorMessages.join(', ') );
    }
    next();
}

/**
 * Patient creation validation rules
 */
const validateCreatePatient = [
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2 })
        .withMessage('First name must be at least 2 characters long'),
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2 })
        .withMessage('Last name must be at least 2 characters long'),
    body('email')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail()
        .isEmail()
        .withMessage('Invalid email format'),
    body('dateOfBirth')
        .isISO8601()    // YYYY-MM-DD:hh:mm:ss.T format
        .withMessage('Date of birth must be a valid ISO 8601 date'),
    body('userId')
        .trim()
        .notEmpty()
        .withMessage('User ID is required'),
    body('gender')
        .trim()
        .optional()
        .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
        .withMessage('invalide gender value'),
    body('phone')
        .optional()
        .trim()
        .isMobilePhone()
        .withMessage('Invalid phone number'),
    validate,
];

/**
 * Patient update validation rules
 */
const validateUpdatePatient = [
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2 })
        .withMessage('First name must be at least 2 characters long'),
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2 })
        .withMessage('Last name must be at least 2 characters long'),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .normalizeEmail()
        .isEmail()
        .withMessage('Invalid email format'),
    body('dateOfBirth')
        .isISO8601()    // YYYY-MM-DD:hh:mm:ss.T format
        .withMessage('Date of birth must be a valid ISO 8601 date'),
    body('gender')
        .optional()
        .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
        .withMessage('invalide gender value'),
    validate,
];

module.exports = {
    validate,
    validateCreatePatient,
    validateUpdatePatient
};
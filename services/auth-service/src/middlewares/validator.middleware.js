const { body, validationResult} = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Validation middleware - check validation results
*/
const validate = (req, res, next) => {
    // Perform validation logic here
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
             errors: errors.array() 
            });
    }
    next();
}

/**
 * Register validation rules
*/
const validateRegister = [
    body('email')
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail(),
    body('password')
        .isLength({min:6})
        .withMessage('Password must be at least 6 characters long')
        .matches(/\d/)
        .withMessage('Password must contain at least one number'),
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({min: 2})
        .withMessage('First name must be at least 2 characters long'),
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({min: 2})
        .withMessage('Last name must be at least 2 characters long'),
    body('roles')
        .isArray()
        .withMessage('Roles must be an array of strings')
        .optional(),
    validate,
    
]

/**
 * Login validation rules
*/
const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    validate,
]

/**
 * Refresh token validation rules
*/
const validateRefreshToken = [
    body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token is required'),
    validate,
]

module.exports = {
    validate,
    validateRegister,
    validateLogin,
    validateRefreshToken,
};



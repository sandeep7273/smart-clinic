/**
 * Authentication Routes
 * Defines all authentication endpoints
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../validators/auth.validator');
const { 
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} = require('../validators/auth.validator');
const { authenticate } = require('../middlewares/auth.middleware');
const { 
  authLimiter, 
  registerLimiter 
} = require('../middlewares/rateLimit.middleware');

const router = express.Router();

/**
 * Public routes (no authentication required)
 */

// Health check
router.get('/health', authController.healthCheck);

// Register new user
router.post(
  '/register',
  registerLimiter,
  validate(registerSchema),
  authController.register
);

// Login
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login
);

// Refresh access token
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refresh
);

// Logout
router.post(
  '/logout',
  validate(logoutSchema),
  authController.logout
);

/**
 * Protected routes (authentication required)
 */

// Get current user profile
router.get('/me', authenticate, authController.getMe);

module.exports = router;

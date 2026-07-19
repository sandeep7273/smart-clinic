/**
 * Authentication Controller
 * Handles HTTP requests for authentication
 */

const authService = require('../services/auth.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const logger = require('../utils/logger.util');

/**
 * Register a new user
 * POST /auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phoneNumber, dateOfBirth, role } = req.body;

  const result = await authService.register({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    dateOfBirth,
    role: role || 'patient', // Default to patient
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});

/**
 * Login user
 * POST /auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const deviceInfo = req.headers['user-agent'] || '';

  const result = await authService.login(email, password, deviceInfo);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

/**
 * Refresh access token
 * POST /auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await authService.refreshAccessToken(refreshToken);

  res.status(200).json({
    success: true,
    message: 'Token refreshed successfully',
    data: result,
  });
});

/**
 * Logout user
 * POST /auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await authService.logout(refreshToken);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * Get current user profile
 * GET /auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  const user = await authService.getUserProfile(userId);

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * Health check endpoint
 * GET /auth/health
 */
const healthCheck = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
  });
});


/**
 * Get all users (for testing purposes)
 * GET /auth/all
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await authService.getAllUsers(); 
  res.status(200).json({
    success: true,
    data: users,
  });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  healthCheck,
  getAllUsers,
};

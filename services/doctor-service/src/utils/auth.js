/**
 * Auth Service Integration
 * Token validation with Auth Service
 */

const axios = require('axios');
const config = require('../config');
const logger = require('./logger');
const { UnauthorizedError } = require('./errors');

/**
 * Validate JWT token with Auth Service
 */
const validateToken = async (token) => {
  try {
    const response = await axios.get(`${config.authServiceUrl}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000,
    });

    return response.data.data.user;
  } catch (error) {
    logger.error('Token validation failed', {
      error: error.message,
      authServiceUrl: config.authServiceUrl,
    });
    
    if (error.response?.status === 401) {
      throw new UnauthorizedError('Invalid or expired token');
    }
    
    throw new Error('Auth service unavailable');
  }
};

module.exports = {
  validateToken,
};

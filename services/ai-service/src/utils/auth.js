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
    const response = await axios.get(`${config.services.apiGateway.url}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000,
    });
    console.log('debugging Token validation response:', response.data); 

    return response.data.data;
  } catch (error) {
    logger.error('Token validation failed', {
      error: error.message,
      apiGatewayUrl: config.apiGatewayUrl,
    });
    
    if (error.response?.status === 401) {
      throw new UnauthorizedError('Invalid or expired token');
    }
    
    throw new Error('Auth service unavailable');
  }
};


/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} Token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

module.exports = {
  validateToken,
  extractTokenFromHeader,
};

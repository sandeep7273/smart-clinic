const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Authentication middleware for GraphQL context
 */
async function authMiddleware(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return { user: null, token: null };
  }

  try {
    // Validate token with auth service
    const response = await axios.get(`${config.services.auth.url}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.data.success && response.data.user) {
      return {
        user: response.data.user,
        token
      };
    }

    return { user: null, token: null };
  } catch (error) {
    logger.error('Error validating token:', error.message);
    return { user: null, token: null };
  }
}

module.exports = authMiddleware;

/**
 * JWT Utility Functions
 * Token extraction, verification, and decoding
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { AuthenticationError } = require('./errors');
const logger = require('./logger');

/**
 * Extract Bearer token from Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null if not found
 */
function extractTokenFromHeader(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return null;
  }

  // Check if it's a Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Verify JWT access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload or throws error
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    return {
      valid: true,
      decoded,
      error: null,
    };
  } catch (error) {
    logger.error('JWT verification failed:', { error: error.message });

    let errorMessage = 'Invalid or expired token';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token';
    }

    return {
      valid: false,
      decoded: null,
      error: errorMessage,
    };
  }
}

/**
 * Decode token without verification (for debugging/logging)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token or null
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Token decode failed:', { error: error.message });
    return null;
  }
}

/**
 * Get token expiration timestamp
 * @param {string} token - JWT token
 * @returns {number|null} Expiration timestamp or null
 */
function getTokenExpiration(token) {
  const decoded = decodeToken(token);
  return decoded?.exp || null;
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
function isTokenExpired(token) {
  const exp = getTokenExpiration(token);
  if (!exp) return true;
  
  return Date.now() >= exp * 1000;
}

module.exports = {
  extractTokenFromHeader,
  verifyAccessToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
};

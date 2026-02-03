/**
 * JWT Utility Functions
 * Token generation, verification, and management
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('./logger.util');

/**
 * Generate Access Token
 * Short-lived token for API access
 */
function generateAccessToken(payload) {
  try {
    const token = jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessTokenExpiry,
      issuer: config.jwt.issuer,
    });
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
}

/**
 * Generate Refresh Token
 * Long-lived token for obtaining new access tokens
 */
function generateRefreshToken(payload) {
  try {
    const token = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshTokenExpiry,
      issuer: config.jwt.issuer,
    });
    return token;
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Verify Access Token
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret, {
      issuer: config.serviceName,
    });
    return { valid: true, decoded };
  } catch (error) {
    logger.warn('Access token verification failed:', error.message);
    return { valid: false, error: error.message };
  }
}

/**
 * Verify Refresh Token
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: config.serviceName,
    });
    return { valid: true, decoded };
  } catch (error) {
    logger.warn('Refresh token verification failed:', error.message);
    return { valid: false, error: error.message };
  }
}

/**
 * Decode token without verification (for debugging)
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Get token expiration time
 */
function getTokenExpiration(token) {
  const decoded = decodeToken(token);
  if (decoded && decoded.exp) {
    return new Date(decoded.exp * 1000);
  }
  return null;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
};

/**
 * Authentication Middleware
 * Validates JWT tokens with Auth Service
 */

const { validateToken } = require('../utils/auth');
const { UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = await validateToken(token);
      req.user = decoded;
      req.authToken = token;
      next();
    } catch (error) {
      logger.error('Token validation failed:', error);
      throw new UnauthorizedError('Invalid or expired token');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = await validateToken(token);
        req.user = decoded;
        req.authToken = token;
      } catch (error) {
        logger.warn('Optional auth failed:', error);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};

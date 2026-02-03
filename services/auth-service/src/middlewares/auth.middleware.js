/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

const { verifyAccessToken } = require('../utils/jwt.util');
const { APIError } = require('./error.middleware');
const logger = require('../utils/logger.util');

/**
 * Authenticate user via JWT access token
 */
function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new APIError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const { valid, decoded, error } = verifyAccessToken(token);

    if (!valid) {
      throw new APIError(error || 'Invalid token', 401);
    }

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Authentication failed:', error.message);
    next(error);
  }
}

/**
 * Authorize user based on roles
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new APIError('Unauthorized', 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new APIError('Forbidden: Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  authenticate,
  authorize,
};

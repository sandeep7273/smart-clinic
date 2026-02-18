/**
 * Authentication Middleware
 * JWT token validation and user extraction
 */

const { extractTokenFromHeader, validateToken } = require('../utils/auth');
const { AuthenticationError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Required authentication middleware
 * Throws error if no valid token is provided
 */
function authenticate() {
  return (req, res, next) => {
    try {
      // Extract token from header
      const token = extractTokenFromHeader(req);

      if (!token) {
        throw new AuthenticationError('No token provided');
      }

      // Verify token
      const { decoded } = validateToken(token);

      if (!decoded) {
        throw new AuthenticationError('Invalid token');
      }

      // Attach user information to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId,
      };

      // Attach full decoded token for advanced use
      req.token = decoded;

      logger.debug('User authenticated', {
        correlationId: req.correlationId,
        userId: req.user.userId,
        role: req.user.role,
      });

      next();
    } catch (error) {
      logger.warn('Authentication failed', {
        correlationId: req.correlationId,
        error: error.message,
        path: req.path,
      });
      next(error);
    }
  };
}

/**
 * Optional authentication middleware
 * Extracts user info if token is present, but doesn't fail if absent
 */
function optionalAuthenticate() {
  return (req, res, next) => {
    try {
      // Extract token from header
      const token = extractTokenFromHeader(req);

      if (!token) {
        // No token, but that's okay for optional auth
        logger.debug('No token provided (optional auth)', {
          correlationId: req.correlationId,
          path: req.path,
        });
        return next();
      }

      // Verify token
      const { decoded } = validateToken(token);

      if (decoded) {
        // Attach user information to request
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          tenantId: decoded.tenantId,
        };

        req.token = decoded;

        logger.debug('User authenticated (optional)', {
          correlationId: req.correlationId,
          userId: req.user.userId,
        });
      } else {
        // Invalid token, but that's okay for optional auth
        logger.debug('Invalid token (optional auth)', {
          correlationId: req.correlationId,
          path: req.path,
        });
      }

      next();
    } catch (error) {
      // Log but don't fail
      logger.debug('Optional authentication error', {
        correlationId: req.correlationId,
        error: error.message,
      });
      next();
    }
  };
}

/**
 * Role-based authorization middleware
 * Requires authenticate() to be called first
 * @param {...string} allowedRoles - Roles that are allowed access
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        correlationId: req.correlationId,
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
      });
      
      const { AuthorizationError } = require('../utils/errors');
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
};

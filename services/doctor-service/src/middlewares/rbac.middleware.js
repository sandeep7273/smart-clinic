const { ForbiddenError, UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Check if user has required role
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const userRole = req.user.role;

      if (!allowedRoles.includes(userRole)) {
        logger.warn(`Access denied for user ${req.user.userId} with role ${userRole}`);
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user is the owner of the resource
 */
const requireOwnership = (userIdParam = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const resourceUserId = req.params[userIdParam] || req.body.userId;
      const requestingUserId = req.user.userId;

      // Allow admins to access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      if (resourceUserId !== requestingUserId) {
        logger.warn(`Ownership check failed for user ${requestingUserId}`);
        throw new ForbiddenError('Access denied: You can only access your own resources');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireRole,
  requireOwnership,
};

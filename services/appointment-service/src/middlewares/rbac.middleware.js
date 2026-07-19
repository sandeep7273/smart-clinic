/**
 * RBAC Middleware
 * Role-Based Access Control
 */

const { ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Require specific role(s)
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('Access denied - insufficient permissions', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: roles,
        });
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require ownership or admin role
 */
const requireOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const isAdmin = req.user.role === 'admin';
      const isOwner = req.params.id === req.user.userId || 
                      req.body[resourceUserIdField] === req.user.userId;

      if (!isAdmin && !isOwner) {
        logger.warn('Access denied - not resource owner', {
          userId: req.user.userId,
          resourceId: req.params.id,
        });
        throw new ForbiddenError('Access denied');
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

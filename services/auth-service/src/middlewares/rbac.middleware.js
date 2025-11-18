const { AuthorizationError } = require('../utils/errors');
const USER_ROLES = require('../models/User');

/**
 * RBAC middleware - Check if user has required roles
 * @param {Array} requiredRoles - Array of roles required to access the route
 * @return {Function} Middleware function
*/

const authorizeAny = (requiredRoles) => {
    return (req, res, next) => {
        try {
            const userRoles = req.user.roles;
            const hasRole = userRoles.some(role => requiredRoles.includes(role));
            if (!hasRole) {
                throw new AuthorizationError('Access denied: insufficient permissions');
            }
            next();
        } catch (error) {
            if (error instanceof AuthorizationError) {
                return res.status(403).json({
                    error: error.message,
                    success: false
                });
            }
            next(error);
        }
    };
};


/**
 * RBAC middleware - Check if user has any of the required roles
 * @param {Array} requiredRoles - Array of roles required to access the route
 * @return {Function} Middleware function
 */



/**
 * RBAC middleware - Check if user has all of the required roles
 * @param {Array} requiredRoles - Array of roles required to access the route
 * @return {Function} Middleware function
*/


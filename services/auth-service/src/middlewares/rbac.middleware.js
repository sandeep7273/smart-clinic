const { AuthorizationError } = require('../utils/errors');
const USER_ROLES = require('../models/User');

/**
 * RBAC middleware - Check if user has any of the required roles
 * @param {Array} requiredRoles - Array of roles required to access the route
 * @return {Function} Middleware function
 */
const authorizeAny = (requiredRoles) => {
    return (req, res, next) => {
        try {
            // Check if user exists and has roles
            if (!req.user || !req.user.roles) {
                return res.status(401).json({
                    error: true,
                    message: 'User not authenticated'
                });
            }

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
 * RBAC middleware - Check if user has all of the required roles
 * @param {Array} requiredRoles - Array of roles required to access the route
 * @return {Function} Middleware function
 */
const authorizeAll = (requiredRoles) => {
    return (req, res, next) => {
        try {
            // Check if user exists and has roles
            if (!req.user || !req.user.roles) {
                throw new AuthorizationError('Access denied: user not authenticated');
            }

            const userRoles = req.user.roles;
            const hasAllRoles = requiredRoles.every(role => userRoles.includes(role));
            
            if (!hasAllRoles) {
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
 * RBAC middleware - Check if user has a specific role
 * @param {String} role - Single role required to access the route
 * @return {Function} Middleware function
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
            // Check if user exists and has roles
            if (!req.user || !req.user.roles) {
                return res.status(401).json({
                    error: true,
                    message: 'User not authenticated'
                });
            }

            const userRoles = req.user.roles;
            const hasRole = roles.some(role => userRoles.includes(role));
            if (!hasRole) {
                return res.status(403).json({
                    error: true,
                    message: 'Access denied: insufficient permissions',
                    required: roles,
                    current: userRoles
                });
            }
            
            next();
        
    };
};

/**
 * RBAC middleware - Check if user is admin
 * @return {Function} Middleware function
 */
const requireAdmin = () => {
    return requireRole(USER_ROLES.ADMIN);
};
const requireDoctor = () => {
    return requireRole(USER_ROLES.DOCTOR, USER_ROLES.CLINICIAN);
}
const requireClinician = () => {
    return requireRole(USER_ROLES.CLINICIAN, USER_ROLES.DOCTOR, USER_ROLES.ADMIN);
};
const requirePatient = () => {
    return requireRole(USER_ROLES.PATIENT);
};

/**
 * RBAC middleware - Check if user owns the resource or has admin role
 * @param {String} resourceIdParam - Parameter name containing resource ID
 * @param {String} userIdField - Field name in user object containing user ID (default: 'id')
 * @return {Function} Middleware function
 */
const requireOwnershipOrAdmin = (resourceIdParam = 'id', userIdField = 'id') => {
    return (req, res, next) => {
        try {
            // Check if user exists
            if (!req.user) {
                throw new AuthorizationError('Access denied: user not authenticated');
            }

            const userId = req.user[userIdField];
            const resourceId = req.params[resourceIdParam];
            const userRoles = req.user.roles || [];

            // Allow if user is admin
            if (userRoles.includes('admin')) {
                return next();
            }

            // Allow if user owns the resource
            if (userId && resourceId && userId.toString() === resourceId.toString()) {
                return next();
            }

            throw new AuthorizationError('Access denied: insufficient permissions');
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
 * RBAC middleware - Check role hierarchy (higher roles can access lower role resources)
 * @param {Array} roleHierarchy - Array of roles in ascending order of permissions
 * @param {String} minimumRole - Minimum role required
 * @return {Function} Middleware function
 */
const requireMinimumRole = (roleHierarchy, minimumRole) => {
    return (req, res, next) => {
        try {
            // Check if user exists and has roles
            if (!req.user || !req.user.roles) {
                throw new AuthorizationError('Access denied: user not authenticated');
            }

            const userRoles = req.user.roles;
            const minimumRoleIndex = roleHierarchy.indexOf(minimumRole);
            
            if (minimumRoleIndex === -1) {
                throw new Error(`Invalid minimum role: ${minimumRole}`);
            }

            // Check if user has any role that meets or exceeds the minimum requirement
            const hasPermission = userRoles.some(role => {
                const userRoleIndex = roleHierarchy.indexOf(role);
                return userRoleIndex !== -1 && userRoleIndex >= minimumRoleIndex;
            });

            if (!hasPermission) {
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

// Export all middleware functions
module.exports = {
    authorizeAny,
    authorizeAll,
    requireRole,
    requireAdmin,
    requireOwnershipOrAdmin,
    requireMinimumRole,
    requireDoctor,
    requireClinician,
    requirePatient
};


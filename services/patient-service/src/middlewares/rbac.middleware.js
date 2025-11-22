/***
 * Role-Based Access Control (RBAC) Middleware
 * This middleware checks if the user has the required roles to access a specific route.
 * @param { ...string } roles - roles required to access the route
 * @return {Function} - middleware function
 */
const requireRoles = (...roles) => {
    return (req, res, next) => {
        if(!req.user) {
            return res.status(401).json({
                message: 'Unauthorized: No user information found',
                success: false
            });
        }

        // Check if user has required roles
        const userRoles = req.user.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));
        if (!hasRole) {
            return res.status(403).json({
                message: 'Access Denied: Insufficient role',
                success: false,
                required: roles,
                current: userRoles
            });
        }

        next();
    };
};


/**
 * Required patient or clinician/admin roles
 */

const requiredPatientOrClinicianRoles = requireRoles['patient', 'doctor', 'clinician', 'admin'];
/**
 * Required clinician/admin roles (health care providers)
 */
const requiredClinicianOrAdminRoles = requireRoles['doctor', 'clinician', 'admin'];

/**
 * Required Admin roles
 */

const requiredAdminRoles = requireRoles['admin'];

module.exports = {
    requireRoles,
    requiredPatientOrClinicianRoles,
    requiredClinicianOrAdminRoles,
    requiredAdminRoles
};
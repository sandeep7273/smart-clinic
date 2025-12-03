/**
 * RBAC Middleware - check if user has required role(s)
 * @param {...String} roles - Required roles
 * @returns {Function} Middleware function
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if(!req.user){
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            })
        }

        const userRoles = req.user.roles || [];
        const hasRole = roles.some(role => userRoles.includes(role));   

        if(!hasRole){
            return res.status(403).json({
                success: false,
                message: 'Access denied, Insufficint permissions',
                required: roles,
                current: userRoles
            })
        }
        next();
    }
}

/**
 * Required patient or clinician / admin roles
 */
const requiredPateintOrClinicianRole = requireRole('patient', 'doctor', 'clinician', 'admin');

/**
 * Required clinician or admin roles (healthcase providers only)
 */
const requiredClinician = requireRole('doctor', 'clinician', 'admin');

/**
 * Required admin role
 */
const requireAdminRole = requireRole('admin');  

module.exports = {
    requireRole,
    requiredPateintOrClinicianRole,
    requiredClinician,
    requireAdminRole
}
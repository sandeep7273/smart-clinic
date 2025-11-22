const { use } = require('react');
const { validateToken, extractTokenFromHeader } = require('../utils/auth')
const { AuthenticationError } = require('../utils/errors');

/**
 * Authentication Middleware - validate JWT token with Auth service
 */

const authenticate = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);
        if (!token) {
            return res.status(401).json({ 
                message: 'No token provided.',
                success: false
            });
        }

        // Validate token with Auth service
        const user = await validateToken(token);
        
        req.user = {
            userId: user.id,
            email: user.email,
            roles: user.roles
        }
        next();
    }
    catch (error) {
        return res.status(401).json({
            message: 'Internal Server Error',
            success: false
        });
    }
}
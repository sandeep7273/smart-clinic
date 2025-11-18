const {verifyAccessToken, extractTokenFromHeader} = require('../utils/jwt')
const { AuthenticationError } = require('../utils/errors');

/**
 * Authentication middleware - Verify JWT access token
*/

const Authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);
        if (!token) throw new AuthenticationError('No token provided');
        const decoded = verifyAccessToken(token);
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            roles: decoded.roles
        };
        next();
    } catch (error) {
        if (error instanceof AuthenticationError || error.message.includes('token')) {
            return res.status(401).json({ 
                error: error.message,
                success: false
            });
        }
        next(error);
    }
};


module.exports = Authenticate;
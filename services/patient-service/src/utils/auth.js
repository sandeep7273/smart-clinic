const axios = require('axios');
const config = require('../config');
const {AuthenticationError} = require('../errors');


/** * Verify JWT token by calling the Auth Service
 * @param {string} token - JWT token to verify
 * @returns {Object} - Decoded token payload
 * @throws {AuthenticationError} - If token is invalid or verification fails
 */

const validateToken = async (token) => {
    try {
        const response = await axios.get(`${config.authServiceUrl}/api/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if(response.data.success) {
            return response.data;
        }
        throw new AuthenticationError('Invalid token');
    } catch (error) {
        if(error.response && error.response.status === 401) {
            throw new AuthenticationError('Invalid or expired token');
        }
        if(error.code === 'ECONNREFUSED') {
            throw new AuthenticationError('Authentication service is unavailable');
        }
        throw new AuthenticationError(error.message || 'Token verification failed');
    }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null if not found
 */
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    return parts[1];
};

module.exports = {
    validateToken,
    extractTokenFromHeader
};

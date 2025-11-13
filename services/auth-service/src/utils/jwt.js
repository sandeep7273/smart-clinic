const jwt = require('jsonwebtoken');
const config = require('../config')

/**
 * Generate JWT access token
 * @param {Object} payload - Payload (userId, email, roles)
 * @returns {String} - Generated JWT token
*/
const generateAccessToken = (payload) => {
    const tokenPayload = {
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles
    };
    return jwt.sign(tokenPayload, config.jwtSecret, {
         expiresIn: config.jwtExpiresIn,
         issuer: config.serviceName
        });
}


/**
 * Generate JWT refresh token
 * @param {Object} payload - Payload (userId)
 * @returns {String} - Generated JWT refresh token
*/
const generateRefreshToken = (payload) => {
    const tokenPayload = {
        userId: payload.userId
    };
    return jwt.sign(tokenPayload, config.jwtRefreshSecret, {
         expiresIn: config.jwtRefreshExpiresIn,
         issuer: config.serviceName
        });
}

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @returns {Object} - Decoded token payload
*/
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Access Token has expired');
        }
        throw new Error('Invalid access token');
    }
}

/**
 * Verify JWT refresh token
 * @param {String} token - JWT refresh token
 * @returns {Object} - Decoded token payload
*/
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, config.jwtRefreshSecret);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Refresh Token has expired');
        }
        throw new Error('Invalid refresh token');
    }
}

/**
 * Extract token from Authorization header
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} - Extracted token or null if not found
*/
const extractTokenFromHeader = (authHeader) => {
    if(!authHeader) {
        return null;
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 && parts[0] !== 'Bearer') {
        return null;
    }
    return parts[1];
}


module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    extractTokenFromHeader,
};
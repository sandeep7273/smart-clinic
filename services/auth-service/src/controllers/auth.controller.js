const authService = require('../services/auth.service');
const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Register new user
 * POST /api/auth/register
 * Body: { username, email, password }
 * Response: { message, userId }
 */
const register = async (req, res, next) => {
    try {
        const userData = req.body;

        const result = await authService.register(userData);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: result
        });
    }catch (error) {
        next(error);
    }

/**
 * Login user
 */

/**
 * Refresh access token
*/

/**
 * Logout user
 */

/**
 * Get user profile
 */

}

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new ValidationError('Email and password are required');
        }

        const result = await authService.login(email, password);

        res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw new ValidationError('Refresh token is required');
        }

        const result = await authService.refreshToken(refreshToken);

        res.status(200).json({
            success: true,
            message: 'Access token refreshed successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

const logout = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        console.log(`Logging out user with ID: ${userId}`);

        await authService.logout(userId);

        res.status(200).json({
            success: true,
            message: 'User logged out successfully'
        });
    } catch (error) {
        next(error);
    }
}

const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const profile = await authService.getProfile(userId);

        res.status(200).json({
            success: true,
            message: 'User profile fetched successfully',
            data: profile
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    getProfile
};

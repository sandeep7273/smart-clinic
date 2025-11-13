const authService = require('../services/auth.service');


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
            throw new Error('Email and password are required');
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

module.exports = {
    register,
    login,
};

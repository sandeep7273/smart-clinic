const {User, USER_ROLES, USER_STATUS} = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt')
const {
    AuthenticationError,
    ConflictError,
    NotFoundError,
} = require('../utils/errors');
const logger = require('../utils/logger');

const register = async (userData) => {
    const { email, password, firstName, lastName, roles } = userData;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        throw new ConflictError('User with this email already exists');
    }

    // set default role if not provided
    const userRoles = roles && roles.length > 0 ? roles : [USER_ROLES.PATIENT];

    // create new user 
    const user = new User({
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
        roles: userRoles,
        status: USER_STATUS.ACTIVE
    })

    // save the user
    await user.save();
console.log('User registered:', user);
     // generate tokens
    const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        roles: user.roles
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: user._id.toString() });

    // save refresh token to user document
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({validateBeforeSave: false});
    logger.info(`New user registered: ${user.email}`);

    return {
        user : {
            userId: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            status: user.status
        },
        accessToken,
        refreshToken,
    };
}

const login = async (email, password) => {
    // find user with password field

    // find user by email
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
        throw new AuthenticationError('Invalid email or password');
    }
    
    // check if user is active
    if (user.status !== USER_STATUS.ACTIVE) {
        throw new NotFoundError('User account is not active');
    }
    // compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new AuthenticationError('Invalid email or password');
    }

    // generate tokens
    const tokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        roles: user.roles
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: user._id.toString() });

    // save refresh token to user document

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({validateBeforeSave: false});

    return {
        user : {
            userId: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            status: user.status
        },
        accessToken,
        refreshToken,
    };
}

const refreshToken = async (token) => {
    try {
        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.userId).select('+refreshToken');

        if(!user || user.refreshToken !== token) {
            throw new AuthenticationError('Invalid refresh token');
        }

        if(user.status !== USER_STATUS.ACTIVE) {
            throw new NotFoundError('User is not active');
        }
        // generate new tokens
        const tokenPayload = {
            userId: user._id.toString(),
            email: user.email,
            roles: user.roles
        };
        const accessToken = generateAccessToken(tokenPayload);
        return{
            accessToken
        }
    } catch (error) {
        throw new AuthenticationError('Invalid refresh token');
    }
}

/**
 * Logout user (invalidate refresh token)
 * @param {String} userId - UserID
 */

const logout = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('User not found');
    }
    user.refreshToken = null;
    await user.save({validateBeforeSave: false});
}

/**
 * Get user profile
 * @param {String} userId - UserID
 * @returns {Object} - User profile
 */

const getProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new NotFoundError('User not found');
    }
    return {
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        status: user.status,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
    };
}

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    getProfile,
};
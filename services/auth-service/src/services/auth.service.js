const {User, USER_ROLES, USER_STATUS} = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt')
const register = async (userData) => {
    const { email, password, firstName, lastName, roles } = userData;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        throw new Error('User with this email already exists');
    }

    // set default role if not provided
    const userRoles = roles && roles.length > 0 ? roles : [USER_ROLES.PATIENT];

    // create new user 
    const user = new User({
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
        role: userRoles,
        status: USER_STATUS.ACTIVE
    })

    // save the user
    await user.save();

     // generate tokens
    const tokenPayload = {
        id: user._id.toString(),
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
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
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
        throw new Error('Invalid email or password');
    }
    
    // check if user is active
    if (user.status !== USER_STATUS.ACTIVE) {
        throw new Error('User account is not active');
    }
    // compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new Error('Invalid email or password');
    }

    // generate tokens
    const tokenPayload = {
        id: user._id.toString(),
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
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status
        },
        accessToken,
        refreshToken,
    };
}


module.exports = {
    register,
    login
};
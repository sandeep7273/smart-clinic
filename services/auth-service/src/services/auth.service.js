/**
 * Authentication Service
 * Business logic for user authentication — instrumented with OTel spans.
 */

const User = require("../models/user");
const { hashPassword, verifyPassword } = require("../utils/password.util");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/jwt.util");
const { APIError } = require("../middlewares/error.middleware");
const logger = require("../utils/logger.util");
const config = require("../config/env");

// Telemetry helpers (singleton — safe to call multiple times)
const { startSpan, endSpan } = require("../telemetry")({
  serviceName: "auth-service",
});

/**
/**
 * Register a new user
 */
async function register(userData) {
  const span = startSpan("auth.register", {
    "user.email": userData.email,
    "auth.action": "register",
  });
  try {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new APIError("Email already registered", 400);
    }

    const hashedPassword = await hashPassword(userData.password);
    const user = await User.create({ ...userData, password: hashedPassword });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.addRefreshToken(refreshToken, refreshTokenExpiry);
    await user.save();

    span.setAttribute("user.id", user.id);
    span.setAttribute("user.role", user.role);
    endSpan(span);
    logger.info(`User registered: ${user.email}`);

    return {
      user: user.toPublicJSON(),
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  } catch (error) {
    endSpan(span, error);
    logger.error("Registration error:", error);
    throw error;
  }
}

/**
 * Login user
 */
async function login(email, password, deviceInfo = "") {
  const span = startSpan("auth.login", {
    "user.email": email,
    "auth.action": "login",
  });
  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      span.setAttribute("auth.result", "invalid_credentials");
      throw new APIError("Invalid email or password", 401);
    }
    if (!user.isActive) {
      span.setAttribute("auth.result", "account_deactivated");
      throw new APIError("Account is deactivated", 403);
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      span.setAttribute("auth.result", "invalid_credentials");
      throw new APIError("Invalid email or password", 401);
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token
    const refreshTokenExpiry = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    );
    user.addRefreshToken(refreshToken, refreshTokenExpiry, deviceInfo);
    user.lastLogin = new Date();
    user.cleanExpiredTokens();
    await user.save();

    span.setAttribute("user.id", user.id);
    span.setAttribute("user.role", user.role);
    span.setAttribute("auth.result", "success");
    endSpan(span);
    logger.info(`User logged in: ${user.email}`);

    return {
      user: user.toPublicJSON(),
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  } catch (error) {
    endSpan(span, error);
    logger.error("Login error:", error);
    throw error;
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(refreshToken) {
  try {
    // Verify refresh token
    const { verifyRefreshToken } = require("../utils/jwt.util");
    const { valid, decoded, error } = verifyRefreshToken(refreshToken);

    if (!valid) {
      throw new APIError(error || "Invalid refresh token", 401);
    }

    // Find user
    const user = await User.findOne({ id: decoded.userId });

    if (!user) {
      throw new APIError("User not found", 404);
    }

    // Check if refresh token exists and is valid
    if (!user.hasValidRefreshToken(refreshToken)) {
      throw new APIError("Invalid or expired refresh token", 401);
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    // Replace old refresh token with new one
    user.removeRefreshToken(refreshToken);
    const refreshTokenExpiry = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    );
    user.addRefreshToken(newRefreshToken, refreshTokenExpiry);

    await user.save();

    logger.info(`Token refreshed for user: ${user.email}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  } catch (error) {
    logger.error("Token refresh error:", error);
    throw error;
  }
}

/**
 * Logout user (invalidate refresh token)
 */
async function logout(refreshToken) {
  try {
    // Verify refresh token
    const { verifyRefreshToken } = require("../utils/jwt.util");
    const { valid, decoded } = verifyRefreshToken(refreshToken);

    if (!valid) {
      // Token might be expired or invalid, but still try to remove it
      logger.warn("Logout attempted with invalid token");
    }

    // Find user and remove refresh token
    const user = await User.findOne({ id: decoded?.userId });

    if (user) {
      user.removeRefreshToken(refreshToken);
      await user.save();
      logger.info(`User logged out: ${user.email}`);
    }

    return { message: "Logged out successfully" };
  } catch (error) {
    logger.error("Logout error:", error);
    // Don't throw error for logout, just log it
    return { message: "Logged out successfully" };
  }
}

/**
 * Get user profile
 */
async function getUserProfile(userId) {
  try {
    const user = await User.findOne({ id: userId });

    if (!user) {
      throw new APIError("User not found", 404);
    }

    return user.toPublicJSON();
  } catch (error) {
    logger.error("Get user profile error:", error);
    throw error;
  }
}

/**
 * Get all users (for testing purposes)
 */
async function getAllUsers() {
  try {
    const users = await User.find({});
    return users.map((user) => user.toPublicJSON());
  } catch (error) {
    logger.error("Get all users error:", error);
    throw error;
  }
}

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getUserProfile,
  getAllUsers,
};

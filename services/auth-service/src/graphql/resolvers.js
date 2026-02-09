/**
 * Auth Service GraphQL Resolvers
 * Implements GraphQL operations for authentication
 */

const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const logger = require('../utils/logger.util');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');

const resolvers = {
  Query: {
    // Get current user
    me: async (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }
      
      try {
        const user = await userService.getUserById(context.user.userId);
        return user;
      } catch (error) {
        logger.error('Error fetching current user:', error);
        throw error;
      }
    },

    // Validate token
    validateToken: async (parent, { token }) => {
      try {
        const result = await authService.validateToken(token);
        return {
          valid: result.valid,
          user: result.user,
          error: result.error
        };
      } catch (error) {
        logger.error('Token validation error:', error);
        return {
          valid: false,
          user: null,
          error: error.message
        };
      }
    },

    // Get user by ID (admin/doctor only)
    getUser: async (parent, { id }, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      if (!['ADMIN', 'DOCTOR'].includes(context.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      try {
        const user = await userService.getUserById(id);
        return user;
      } catch (error) {
        logger.error('Error fetching user:', error);
        throw error;
      }
    },

    // Get all users with filters (admin only)
    getUsers: async (parent, { role, isActive, page, limit, search }, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      try {
        const filters = { role, isActive, search };
        const result = await userService.getUsers(filters, page, limit);
        
        return {
          users: result.users,
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
            hasNext: result.pagination.hasNext,
            hasPrev: result.pagination.hasPrev
          }
        };
      } catch (error) {
        logger.error('Error fetching users:', error);
        throw error;
      }
    }
  },

  Mutation: {
    // Register new user
    register: async (parent, { input }) => {
      try {
        const result = await authService.register(input);
        return {
          success: true,
          message: 'User registered successfully',
          token: result.token,
          refreshToken: result.refreshToken,
          user: result.user,
          expiresIn: result.expiresIn
        };
      } catch (error) {
        logger.error('Registration error:', error);
        return {
          success: false,
          message: error.message,
          token: null,
          refreshToken: null,
          user: null
        };
      }
    },

    // User login
    login: async (parent, { input }) => {
      try {
        const result = await authService.login(input.email, input.password);
        return {
          success: true,
          message: 'Login successful',
          token: result.token,
          refreshToken: result.refreshToken,
          user: result.user,
          expiresIn: result.expiresIn
        };
      } catch (error) {
        logger.error('Login error:', error);
        return {
          success: false,
          message: error.message,
          token: null,
          refreshToken: null,
          user: null
        };
      }
    },

    // Refresh access token
    refreshToken: async (parent, { refreshToken }) => {
      try {
        const result = await authService.refreshToken(refreshToken);
        return {
          success: true,
          message: 'Token refreshed successfully',
          token: result.token,
          refreshToken: result.refreshToken,
          user: result.user,
          expiresIn: result.expiresIn
        };
      } catch (error) {
        logger.error('Token refresh error:', error);
        return {
          success: false,
          message: error.message,
          token: null,
          refreshToken: null,
          user: null
        };
      }
    },

    // Logout
    logout: async (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      try {
        await authService.logout(context.user.userId);
        return true;
      } catch (error) {
        logger.error('Logout error:', error);
        return false;
      }
    },

    // Update user profile
    updateProfile: async (parent, { input }, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      try {
        const updatedUser = await userService.updateProfile(context.user.userId, input);
        return updatedUser;
      } catch (error) {
        logger.error('Profile update error:', error);
        throw error;
      }
    },

    // Change password
    changePassword: async (parent, { input }, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      try {
        await authService.changePassword(
          context.user.userId, 
          input.currentPassword, 
          input.newPassword
        );
        return true;
      } catch (error) {
        logger.error('Password change error:', error);
        throw error;
      }
    },

    // Request password reset
    requestPasswordReset: async (parent, { input }) => {
      try {
        await authService.requestPasswordReset(input.email);
        return true;
      } catch (error) {
        logger.error('Password reset request error:', error);
        // Don't throw error for security (don't reveal if email exists)
        return true;
      }
    },

    // Reset password with token
    resetPassword: async (parent, { input }) => {
      try {
        await authService.resetPassword(input.token, input.newPassword);
        return true;
      } catch (error) {
        logger.error('Password reset error:', error);
        throw new UserInputError('Invalid or expired reset token');
      }
    },

    // Verify email
    verifyEmail: async (parent, { token }) => {
      try {
        await authService.verifyEmail(token);
        return true;
      } catch (error) {
        logger.error('Email verification error:', error);
        throw new UserInputError('Invalid or expired verification token');
      }
    },

    // Resend email verification
    resendEmailVerification: async (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      try {
        await authService.resendEmailVerification(context.user.userId);
        return true;
      } catch (error) {
        logger.error('Email verification resend error:', error);
        throw error;
      }
    },

    // Admin: Update user status
    updateUserStatus: async (parent, { userId, isActive }, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      try {
        const updatedUser = await userService.updateUserStatus(userId, isActive);
        return updatedUser;
      } catch (error) {
        logger.error('User status update error:', error);
        throw error;
      }
    },

    // Admin: Update user role
    updateUserRole: async (parent, { userId, role }, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      try {
        const updatedUser = await userService.updateUserRole(userId, role);
        return updatedUser;
      } catch (error) {
        logger.error('User role update error:', error);
        throw error;
      }
    },

    // Admin: Delete user (soft delete)
    deleteUser: async (parent, { userId }, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      try {
        await userService.deleteUser(userId);
        return true;
      } catch (error) {
        logger.error('User deletion error:', error);
        throw error;
      }
    }
  },

  // Field resolvers
  User: {
    // Resolve user ID
    id: (user) => user._id || user.id,
    
    // Format dates
    createdAt: (user) => user.createdAt?.toISOString(),
    updatedAt: (user) => user.updatedAt?.toISOString(),
    
    // Resolve nested fields
    profile: async (user) => {
      if (user.profile) {
        return user.profile;
      }
      // Load profile separately if needed
      return null;
    }
  }
};

module.exports = resolvers;
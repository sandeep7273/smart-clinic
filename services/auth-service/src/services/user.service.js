/**
 * User Service
 * Business logic for user management operations
 */

const authService = require('./auth.service');
const User = require('../models/user');
const { APIError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger.util');

/**
 * Get user by ID
 */
async function getUserById(userId) {
  try {
    const user = await User.findById(userId).select('-password -refreshTokens');
    if (!user) {
      throw new APIError('User not found', 404);
    }
    return user;
  } catch (error) {
    logger.error('Error getting user by ID:', { userId, error: error.message });
    throw error;
  }
}

/**
 * Get user by email
 */
async function getUserByEmail(email) {
  try {
    const user = await User.findOne({ email }).select('-password -refreshTokens');
    if (!user) {
      throw new APIError('User not found', 404);
    }
    return user;
  } catch (error) {
    logger.error('Error getting user by email:', { email, error: error.message });
    throw error;
  }
}

/**
 * Update user profile
 */
async function updateProfile(userId, updateData) {
  try {
    // Remove sensitive fields that shouldn't be updated directly
    const { password, role, refreshTokens, ...safeUpdateData } = updateData;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        ...safeUpdateData,
        updatedAt: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    ).select('-password -refreshTokens');

    if (!user) {
      throw new APIError('User not found', 404);
    }

    logger.info('User profile updated:', { userId, updatedFields: Object.keys(safeUpdateData) });
    return user;
  } catch (error) {
    logger.error('Error updating user profile:', { userId, error: error.message });
    throw error;
  }
}

/**
 * Change user password
 */
async function changePassword(userId, currentPassword, newPassword) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new APIError('User not found', 404);
    }

    // Verify current password
    const { verifyPassword } = require('../utils/password.util');
    const isValidPassword = await verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new APIError('Current password is incorrect', 400);
    }

    // Hash and set new password
    const { hashPassword } = require('../utils/password.util');
    const hashedPassword = await hashPassword(newPassword);
    
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();

    logger.info('User password changed:', { userId });
    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    logger.error('Error changing password:', { userId, error: error.message });
    throw error;
  }
}

/**
 * Get users with filtering and pagination
 */
async function getUsers(filter = {}, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Build filter query
    const query = {};
    if (filter.role) query.role = filter.role;
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    if (filter.isEmailVerified !== undefined) query.isEmailVerified = filter.isEmailVerified;
    if (filter.tenantId) query.tenantId = filter.tenantId;
    if (filter.search) {
      query.$or = [
        { firstName: { $regex: filter.search, $options: 'i' } },
        { lastName: { $regex: filter.search, $options: 'i' } },
        { email: { $regex: filter.search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshTokens')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    return {
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      }
    };
  } catch (error) {
    logger.error('Error getting users:', { filter, options, error: error.message });
    throw error;
  }
}

/**
 * Delete user (soft delete)
 */
async function deleteUser(userId) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -refreshTokens');

    if (!user) {
      throw new APIError('User not found', 404);
    }

    logger.info('User deleted (soft):', { userId });
    return user;
  } catch (error) {
    logger.error('Error deleting user:', { userId, error: error.message });
    throw error;
  }
}

/**
 * Activate/deactivate user
 */
async function toggleUserStatus(userId, isActive) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -refreshTokens');

    if (!user) {
      throw new APIError('User not found', 404);
    }

    logger.info('User status toggled:', { userId, isActive });
    return user;
  } catch (error) {
    logger.error('Error toggling user status:', { userId, error: error.message });
    throw error;
  }
}

/**
 * Get user statistics
 */
async function getUserStats() {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          verifiedUsers: {
            $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] }
          },
          doctorUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'doctor'] }, 1, 0] }
          },
          patientUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'patient'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      verifiedUsers: 0,
      doctorUsers: 0,
      patientUsers: 0
    };

    delete result._id;
    return result;
  } catch (error) {
    logger.error('Error getting user stats:', { error: error.message });
    throw error;
  }
}

module.exports = {
  getUserById,
  getUserByEmail,
  updateProfile,
  changePassword,
  getUsers,
  deleteUser,
  toggleUserStatus,
  getUserStats,
  
  // Re-export auth service functions
  register: authService.register,
  login: authService.login,
  logout: authService.logout,
  refreshTokens: authService.refreshTokens,
  validateToken: authService.validateToken,
  forgotPassword: authService.forgotPassword,
  resetPassword: authService.resetPassword,
  verifyEmail: authService.verifyEmail,
  resendVerification: authService.resendVerification
};
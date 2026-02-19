/**
 * Unit Tests for User Service
 */

const userService = require('../../../src/services/user.service');
const User = require('../../../src/models/user');
const { APIError } = require('../../../src/middlewares/error.middleware');
const { hashPassword, verifyPassword } = require('../../../src/utils/password.util');

// Mock dependencies
jest.mock('../../../src/models/user');
jest.mock('../../../src/utils/logger.util', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));
jest.mock('../../../src/utils/password.util');

describe('User Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'patient',
      };

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userService.getUserById('user-123');

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });

    it('should throw APIError when user not found', async () => {
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(userService.getUserById('nonexistent-id')).rejects.toThrow(
        APIError
      );
      await expect(userService.getUserById('nonexistent-id')).rejects.toThrow(
        'User not found'
      );
    });

    it('should exclude password and refreshTokens from result', async () => {
      const selectMock = jest.fn().mockResolvedValue({});
      User.findById = jest.fn().mockReturnValue({
        select: selectMock,
      });

      await userService.getUserById('user-123');

      expect(selectMock).toHaveBeenCalledWith('-password -refreshTokens');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(dbError),
      });

      await expect(userService.getUserById('user-123')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userService.getUserByEmail('test@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toEqual(mockUser);
    });

    it('should throw APIError when user not found', async () => {
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        userService.getUserByEmail('nonexistent@example.com')
      ).rejects.toThrow('User not found');
    });

    it('should exclude sensitive fields', async () => {
      const selectMock = jest.fn().mockResolvedValue({});
      User.findOne = jest.fn().mockReturnValue({
        select: selectMock,
      });

      await userService.getUserByEmail('test@example.com');

      expect(selectMock).toHaveBeenCalledWith('-password -refreshTokens');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+1234567890',
      };

      const updatedUser = {
        _id: 'user-123',
        ...updateData,
      };

      User.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await userService.updateProfile('user-123', updateData);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining(updateData),
        expect.objectContaining({
          new: true,
          runValidators: true,
        })
      );
      expect(result).toEqual(updatedUser);
    });

    it('should remove sensitive fields from update data', async () => {
      const updateData = {
        firstName: 'Updated',
        password: 'should-not-update',
        role: 'admin',
        refreshTokens: ['token1', 'token2'],
      };

      User.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({}),
      });

      await userService.updateProfile('user-123', updateData);

      const updateCall = User.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall).not.toHaveProperty('password');
      expect(updateCall).not.toHaveProperty('role');
      expect(updateCall).not.toHaveProperty('refreshTokens');
      expect(updateCall).toHaveProperty('firstName', 'Updated');
    });

    it('should throw APIError when user not found', async () => {
      User.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        userService.updateProfile('nonexistent-id', { firstName: 'Test' })
      ).rejects.toThrow('User not found');
    });

    it('should add updatedAt timestamp', async () => {
      User.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({}),
      });

      await userService.updateProfile('user-123', { firstName: 'Test' });

      const updateCall = User.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall).toHaveProperty('updatedAt');
      expect(updateCall.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        _id: 'user-123',
        password: 'hashed-old-password',
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      hashPassword.mockResolvedValue('hashed-new-password');

      const result = await userService.changePassword(
        'user-123',
        'OldPassword@123',
        'NewPassword@123'
      );

      expect(verifyPassword).toHaveBeenCalledWith(
        'OldPassword@123',
        'hashed-old-password'
      );
      expect(hashPassword).toHaveBeenCalledWith('NewPassword@123');
      expect(mockUser.password).toBe('hashed-new-password');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should throw error when user not found', async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(
        userService.changePassword('nonexistent-id', 'old', 'new')
      ).rejects.toThrow('User not found');
    });

    it('should throw error when current password is incorrect', async () => {
      const mockUser = {
        _id: 'user-123',
        password: 'hashed-password',
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(false);

      await expect(
        userService.changePassword('user-123', 'WrongPassword@123', 'NewPassword@123')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should update updatedAt timestamp', async () => {
      const mockUser = {
        _id: 'user-123',
        password: 'hashed-old-password',
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      verifyPassword.mockResolvedValue(true);
      hashPassword.mockResolvedValue('hashed-new-password');

      await userService.changePassword('user-123', 'OldPassword@123', 'NewPassword@123');

      expect(mockUser.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users list', async () => {
      const mockUsers = [
        { _id: '1', email: 'user1@example.com' },
        { _id: '2', email: 'user2@example.com' },
      ];

      const queryMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers),
      };

      User.find = jest.fn().mockReturnValue(queryMock);
      User.countDocuments = jest.fn().mockResolvedValue(10);

      const result = await userService.getUsers();

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('pagination');
      expect(result.users).toEqual(mockUsers);
      expect(result.pagination.totalItems).toBe(10);
    });

    it('should apply role filter', async () => {
      const queryMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      User.find = jest.fn().mockReturnValue(queryMock);
      User.countDocuments = jest.fn().mockResolvedValue(0);

      await userService.getUsers({ role: 'doctor' });

      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'doctor' })
      );
    });

    it('should apply search filter', async () => {
      const queryMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      User.find = jest.fn().mockReturnValue(queryMock);
      User.countDocuments = jest.fn().mockResolvedValue(0);

      await userService.getUsers({ search: 'john' });

      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.objectContaining({ firstName: expect.any(Object) }),
            expect.objectContaining({ lastName: expect.any(Object) }),
            expect.objectContaining({ email: expect.any(Object) }),
          ]),
        })
      );
    });

    it('should handle pagination options', async () => {
      const queryMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      User.find = jest.fn().mockReturnValue(queryMock);
      User.countDocuments = jest.fn().mockResolvedValue(100);

      await userService.getUsers({}, { page: 2, limit: 10 });

      expect(queryMock.skip).toHaveBeenCalledWith(10);
      expect(queryMock.limit).toHaveBeenCalledWith(10);
    });

    it('should calculate pagination metadata correctly', async () => {
      const queryMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      User.find = jest.fn().mockReturnValue(queryMock);
      User.countDocuments = jest.fn().mockResolvedValue(50);

      const result = await userService.getUsers({}, { page: 2, limit: 20 });

      expect(result.pagination).toEqual({
        currentPage: 2,
        totalPages: 3,
        totalItems: 50,
        itemsPerPage: 20,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user', async () => {
      const mockUser = {
        _id: 'user-123',
        isActive: false,
      };

      User.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userService.deleteUser('user-123');

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
        }),
        { new: true }
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw error when user not found', async () => {
      User.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(userService.deleteUser('nonexistent-id')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('toggleUserStatus', () => {
    it('should activate user', async () => {
      const mockUser = {
        _id: 'user-123',
        isActive: true,
      };

      User.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userService.toggleUserStatus('user-123', true);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ isActive: true }),
        { new: true }
      );
      expect(result.isActive).toBe(true);
    });

    it('should deactivate user', async () => {
      const mockUser = {
        _id: 'user-123',
        isActive: false,
      };

      User.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userService.toggleUserStatus('user-123', false);

      expect(result.isActive).toBe(false);
    });

    it('should throw error when user not found', async () => {
      User.findByIdAndUpdate = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        userService.toggleUserStatus('nonexistent-id', true)
      ).rejects.toThrow('User not found');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockStats = [
        {
          _id: null,
          totalUsers: 100,
          activeUsers: 80,
          verifiedUsers: 70,
          doctorUsers: 20,
          patientUsers: 75,
        },
      ];

      User.aggregate = jest.fn().mockResolvedValue(mockStats);

      const result = await userService.getUserStats();

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 80,
        verifiedUsers: 70,
        doctorUsers: 20,
        patientUsers: 75,
      });
      expect(result).not.toHaveProperty('_id');
    });

    it('should return default stats when no users exist', async () => {
      User.aggregate = jest.fn().mockResolvedValue([]);

      const result = await userService.getUserStats();

      expect(result).toEqual({
        totalUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        doctorUsers: 0,
        patientUsers: 0,
      });
    });

    it('should use aggregation pipeline', async () => {
      User.aggregate = jest.fn().mockResolvedValue([]);

      await userService.getUserStats();

      expect(User.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $group: expect.any(Object),
          }),
        ])
      );
    });
  });
});

/**
 * Unit Tests for Auth Service
 */

// Mock mongoose to avoid real DB connections/indexing during unit tests
jest.mock('mongoose', () => {
  const m = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    connection: { close: jest.fn().mockResolvedValue(undefined), on: jest.fn(), once: jest.fn() },
    Schema: function () {
      const s = {};
      s.index = jest.fn();
      s.plugin = jest.fn();
      s.pre = jest.fn();
      s.post = jest.fn();
      s.methods = {};
      s.statics = {};
      s.virtual = jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() });
      s.set = jest.fn();
      return s;
    },
    model: jest.fn().mockImplementation(() => {
      const modelFn = function (doc) { Object.assign(this, doc); };
      modelFn.findOne = jest.fn().mockResolvedValue(null);
      modelFn.find = jest.fn().mockResolvedValue([]);
      modelFn.create = jest.fn().mockImplementation(async (doc) => {
        const instance = new modelFn(doc);
        instance.save = jest.fn().mockResolvedValue(instance);
        return instance;
      });
      modelFn.findOneAndUpdate = jest.fn().mockImplementation(async (query, update) => ({ ...query, ...update }));
      modelFn.updateOne = jest.fn().mockResolvedValue({ nModified: 1 });
      modelFn.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      modelFn.prototype.save = jest.fn().mockResolvedValue();
      return modelFn;
    }),
    Types: { ObjectId: { isValid: jest.fn().mockReturnValue(true) } },
    set: jest.fn(),
  };
  return m;
});

const authService = require('../../../src/services/auth.service');
const User = require('../../../src/models/user');
const { hashPassword } = require('../../../src/utils/password.util');
const { APIError } = require('../../../src/middlewares/error.middleware');

// Mock dependencies
jest.mock('../../../src/utils/logger.util', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Auth Service - Unit Tests', () => {
  beforeEach(async () => {
    // Clear database before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'Password@123',
        firstName: 'New',
        lastName: 'User',
        phoneNumber: '+1234567890',
        role: 'patient',
      };

      const result = await authService.register(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user).not.toHaveProperty('password'); // Password should not be in response
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User',
      };

      // Create first user
      await authService.register(userData);

      // Try to create duplicate
      await expect(authService.register(userData))
        .rejects
        .toThrow('Email already registered');
    });

    it('should hash password before storing', async () => {
      const userData = {
        email: 'secure@example.com',
        password: 'Password@123',
        firstName: 'Secure',
        lastName: 'User',
      };

      await authService.register(userData);

      const user = await User.findOne({ email: userData.email }).select('+password');
      expect(user.password).not.toBe(userData.password);
      expect(user.password).toMatch(/^\$2[ayb]\$.{56}$/); // bcrypt hash pattern
    });

    it('should set default role to patient if not specified', async () => {
      const userData = {
        email: 'patient@example.com',
        password: 'Password@123',
        firstName: 'Patient',
        lastName: 'User',
      };

      const result = await authService.register(userData);
      expect(result.user.role).toBe('patient');
    });

    it('should generate valid tokens', async () => {
      const userData = {
        email: 'token@example.com',
        password: 'Password@123',
        firstName: 'Token',
        lastName: 'User',
      };

      const result = await authService.register(userData);

      expect(result.accessToken).toBeTruthy();
      expect(typeof result.accessToken).toBe('string');
      expect(result.refreshToken).toBeTruthy();
      expect(typeof result.refreshToken).toBe('string');
      expect(result.expiresIn).toBe(900); // 15 minutes
    });
  });

  describe('login', () => {
    let testUser;
    const password = 'Password@123';

    beforeEach(async () => {
      // Create test user
      const hashedPassword = await hashPassword(password);
      testUser = await User.create({
        email: 'login@example.com',
        password: hashedPassword,
        firstName: 'Login',
        lastName: 'Test',
        role: 'patient',
      });
    });

    it('should successfully login with valid credentials', async () => {
      const result = await authService.login(testUser.email, password);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(testUser.email);
    });

    it('should throw error for invalid email', async () => {
      await expect(authService.login('invalid@example.com', password))
        .rejects
        .toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      await expect(authService.login(testUser.email, 'WrongPassword'))
        .rejects
        .toThrow('Invalid email or password');
    });

    it('should throw error for inactive user', async () => {
      testUser.isActive = false;
      await testUser.save();

      await expect(authService.login(testUser.email, password))
        .rejects
        .toThrow('Account is deactivated');
    });

    it('should update lastLogin timestamp', async () => {
      const beforeLogin = testUser.lastLogin;
      
      await authService.login(testUser.email, password);

      const updatedUser = await User.findOne({ email: testUser.email });
      expect(updatedUser.lastLogin).toBeTruthy();
      expect(updatedUser.lastLogin).not.toBe(beforeLogin);
    });

    it('should store refresh token in user document', async () => {
      const result = await authService.login(testUser.email, password);

      const updatedUser = await User.findOne({ email: testUser.email });
      expect(updatedUser.refreshTokens.length).toBeGreaterThan(0);
      expect(updatedUser.refreshTokens[0].token).toBe(result.refreshToken);
    });
  });

  describe('refreshAccessToken', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      // Create and login user
      const userData = {
        email: 'refresh@example.com',
        password: 'Password@123',
        firstName: 'Refresh',
        lastName: 'Test',
      };

      const result = await authService.register(userData);
      testUser = result.user;
      refreshToken = result.refreshToken;
    });

    it('should successfully refresh access token with valid refresh token', async () => {
      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(authService.refreshAccessToken('invalid-token'))
        .rejects
        .toThrow();
    });

    it('should throw error for expired refresh token', async () => {
      // Update refresh token expiry to past
      const user = await User.findOne({ email: 'refresh@example.com' });
      user.refreshTokens[0].expiresAt = new Date(Date.now() - 1000);
      await user.save();

      await expect(authService.refreshAccessToken(refreshToken))
        .rejects
        .toThrow('Refresh token expired');
    });

    it('should generate new refresh token', async () => {
      const result = await authService.refreshAccessToken(refreshToken);

      expect(result.refreshToken).toBeTruthy();
      expect(result.refreshToken).not.toBe(refreshToken);
    });
  });

  describe('logout', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      const userData = {
        email: 'logout@example.com',
        password: 'Password@123',
        firstName: 'Logout',
        lastName: 'Test',
      };

      const result = await authService.register(userData);
      testUser = result.user;
      refreshToken = result.refreshToken;
    });

    it('should successfully logout and remove refresh token', async () => {
      const result = await authService.logout(refreshToken);

      expect(result.message).toBe('Logged out successfully');

      const user = await User.findOne({ email: 'logout@example.com' });
      expect(user.refreshTokens.length).toBe(0);
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(authService.logout('invalid-token'))
        .rejects
        .toThrow();
    });

    it('should handle logout even if token not found', async () => {
      // Manually remove tokens
      const user = await User.findOne({ email: 'logout@example.com' });
      user.refreshTokens = [];
      await user.save();

      const result = await authService.logout(refreshToken);
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('getUserProfile', () => {
    let testUser;

    beforeEach(async () => {
      const hashedPassword = await hashPassword('Password@123');
      testUser = await User.create({
        email: 'profile@example.com',
        password: hashedPassword,
        firstName: 'Profile',
        lastName: 'Test',
        role: 'doctor',
        phoneNumber: '+1234567890',
      });
    });

    it('should return user profile without password', async () => {
      const profile = await authService.getUserProfile(testUser.id);

      expect(profile.email).toBe(testUser.email);
      expect(profile.firstName).toBe(testUser.firstName);
      expect(profile).not.toHaveProperty('password');
    });

    it('should throw error for non-existent user', async () => {
      await expect(authService.getUserProfile('non-existent-id'))
        .rejects
        .toThrow('User not found');
    });

    it('should include all public user fields', async () => {
      const profile = await authService.getUserProfile(testUser.id);

      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('firstName');
      expect(profile).toHaveProperty('lastName');
      expect(profile).toHaveProperty('role');
      expect(profile).toHaveProperty('phoneNumber');
    });
  });
});

/**
 * Unit Tests for User Model
 */

const User = require('../../../src/models/user');
const mongoose = require('mongoose');

describe('User Model - Unit Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'model@example.com',
        password: 'hashedpassword123',
        firstName: 'Model',
        lastName: 'Test',
      };

      const user = await User.create(userData);

      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.id).toBeDefined();
      expect(user.role).toBe('patient'); // default role
      expect(user.isActive).toBe(true);
      expect(user.isEmailVerified).toBe(false);
    });

    it('should generate unique id for each user', async () => {
      const user1 = await User.create({
        email: 'user1@example.com',
        password: 'password',
        firstName: 'User',
        lastName: 'One',
      });

      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'password',
        firstName: 'User',
        lastName: 'Two',
      });

      expect(user1.id).toBeDefined();
      expect(user2.id).toBeDefined();
      expect(user1.id).not.toBe(user2.id);
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'unique@example.com',
        password: 'password',
        firstName: 'Unique',
        lastName: 'Test',
      };

      await User.create(userData);

      await expect(User.create(userData))
        .rejects
        .toThrow();
    });

    it('should require email field', async () => {
      const userData = {
        password: 'password',
        firstName: 'No',
        lastName: 'Email',
      };

      await expect(User.create(userData))
        .rejects
        .toThrow(/email.*required/i);
    });

    it('should require password field', async () => {
      const userData = {
        email: 'nopassword@example.com',
        firstName: 'No',
        lastName: 'Password',
      };

      await expect(User.create(userData))
        .rejects
        .toThrow(/password.*required/i);
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password',
        firstName: 'Invalid',
        lastName: 'Email',
      };

      await expect(User.create(userData))
        .rejects
        .toThrow();
    });

    it('should enforce minimum password length', async () => {
      const userData = {
        email: 'short@example.com',
        password: 'short',
        firstName: 'Short',
        lastName: 'Password',
      };

      await expect(User.create(userData))
        .rejects
        .toThrow(/at least 8 characters/i);
    });

    it('should accept valid roles', async () => {
      const patientUser = await User.create({
        email: 'patient@example.com',
        password: 'password123',
        firstName: 'Patient',
        lastName: 'User',
        role: 'patient',
      });

      const doctorUser = await User.create({
        email: 'doctor@example.com',
        password: 'password123',
        firstName: 'Doctor',
        lastName: 'User',
        role: 'doctor',
      });

      const adminUser = await User.create({
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      });

      expect(patientUser.role).toBe('patient');
      expect(doctorUser.role).toBe('doctor');
      expect(adminUser.role).toBe('admin');
    });

    it('should reject invalid roles', async () => {
      const userData = {
        email: 'invalid@example.com',
        password: 'password123',
        firstName: 'Invalid',
        lastName: 'Role',
        role: 'superuser', // invalid role
      };

      await expect(User.create(userData))
        .rejects
        .toThrow();
    });

    it('should convert email to lowercase', async () => {
      const user = await User.create({
        email: 'UPPERCASE@EXAMPLE.COM',
        password: 'password123',
        firstName: 'Upper',
        lastName: 'Case',
      });

      expect(user.email).toBe('uppercase@example.com');
    });

    it('should trim email whitespace', async () => {
      const user = await User.create({
        email: '  trimmed@example.com  ',
        password: 'password123',
        firstName: 'Trimmed',
        lastName: 'Email',
      });

      expect(user.email).toBe('trimmed@example.com');
    });
  });

  describe('User Methods', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'methods@example.com',
        password: 'password123',
        firstName: 'Methods',
        lastName: 'Test',
        role: 'patient',
      });
    });

    it('should have toPublicJSON method', () => {
      expect(typeof testUser.toPublicJSON).toBe('function');
    });

    it('toPublicJSON should not include password', () => {
      const publicData = testUser.toPublicJSON();
      expect(publicData).not.toHaveProperty('password');
    });

    it('toPublicJSON should include public fields', () => {
      const publicData = testUser.toPublicJSON();
      expect(publicData).toHaveProperty('id');
      expect(publicData).toHaveProperty('email');
      expect(publicData).toHaveProperty('firstName');
      expect(publicData).toHaveProperty('lastName');
      expect(publicData).toHaveProperty('role');
    });

    it('should have addRefreshToken method', () => {
      expect(typeof testUser.addRefreshToken).toBe('function');
    });

    it('addRefreshToken should add token to refreshTokens array', () => {
      const token = 'test-refresh-token';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      testUser.addRefreshToken(token, expiresAt, 'Test Device');

      expect(testUser.refreshTokens.length).toBe(1);
      expect(testUser.refreshTokens[0].token).toBe(token);
      expect(testUser.refreshTokens[0].deviceInfo).toBe('Test Device');
    });

    it('should have removeRefreshToken method', () => {
      expect(typeof testUser.removeRefreshToken).toBe('function');
    });

    it('removeRefreshToken should remove specific token', () => {
      const token1 = 'token-1';
      const token2 = 'token-2';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      testUser.addRefreshToken(token1, expiresAt);
      testUser.addRefreshToken(token2, expiresAt);

      expect(testUser.refreshTokens.length).toBe(2);

      testUser.removeRefreshToken(token1);

      expect(testUser.refreshTokens.length).toBe(1);
      expect(testUser.refreshTokens[0].token).toBe(token2);
    });

    it('should have cleanupExpiredTokens method', () => {
      expect(typeof testUser.cleanupExpiredTokens).toBe('function');
    });

    it('cleanupExpiredTokens should remove expired tokens', () => {
      const validToken = 'valid-token';
      const expiredToken = 'expired-token';
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const pastDate = new Date(Date.now() - 1000);

      testUser.addRefreshToken(validToken, futureDate);
      testUser.addRefreshToken(expiredToken, pastDate);

      expect(testUser.refreshTokens.length).toBe(2);

      testUser.cleanupExpiredTokens();

      expect(testUser.refreshTokens.length).toBe(1);
      expect(testUser.refreshTokens[0].token).toBe(validToken);
    });
  });

  describe('User Timestamps', () => {
    it('should automatically add createdAt and updatedAt', async () => {
      const user = await User.create({
        email: 'timestamps@example.com',
        password: 'password123',
        firstName: 'Timestamp',
        lastName: 'Test',
      });

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
      const user = await User.create({
        email: 'update@example.com',
        password: 'password123',
        firstName: 'Update',
        lastName: 'Test',
      });

      const originalUpdatedAt = user.updatedAt;

      // Wait and update
      await new Promise(resolve => setTimeout(resolve, 100));
      user.firstName = 'Updated';
      await user.save();

      expect(user.updatedAt).not.toEqual(originalUpdatedAt);
    });
  });

  describe('User Indexes', () => {
    it('should have index on email', async () => {
      const indexes = await User.collection.getIndexes();
      expect(indexes).toHaveProperty('email_1');
    });

    it('should have index on id', async () => {
      const indexes = await User.collection.getIndexes();
      expect(indexes).toHaveProperty('id_1');
    });
  });

  describe('Password field', () => {
    it('should not select password by default', async () => {
      await User.create({
        email: 'nopassword@example.com',
        password: 'password123',
        firstName: 'No',
        lastName: 'Password',
      });

      const user = await User.findOne({ email: 'nopassword@example.com' });
      expect(user.password).toBeUndefined();
    });

    it('should select password when explicitly requested', async () => {
      await User.create({
        email: 'withpassword@example.com',
        password: 'password123',
        firstName: 'With',
        lastName: 'Password',
      });

      const user = await User.findOne({ email: 'withpassword@example.com' }).select('+password');
      expect(user.password).toBeDefined();
      expect(user.password).toBe('password123');
    });
  });
});

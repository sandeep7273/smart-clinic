/**
 * Unit Tests for Auth Controller
 */

const request = require('supertest');
const express = require('express');
const authController = require('../../../src/controllers/auth.controller');
const authService = require('../../../src/services/auth.service');
const User = require('../../../src/models/user');

// Create test app
const app = express();
app.use(express.json());

// Mock auth middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = { userId: 'test-user-id', email: 'test@example.com', role: 'patient' };
  next();
};

// Setup routes
app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);
app.post('/auth/refresh', authController.refresh);
app.post('/auth/logout', authController.logout);
app.get('/auth/me', mockAuthMiddleware, authController.getMe);

// Mock logger
jest.mock('../../../src/utils/logger.util', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

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
      modelFn.deleteMany = jest.fn().mockResolvedValue({});
      modelFn.prototype.save = jest.fn().mockResolvedValue();
      return modelFn;
    }),
    Types: { ObjectId: { isValid: jest.fn().mockReturnValue(true) } },
    set: jest.fn(),
  };
  return m;
});

describe('Auth Controller - Unit Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'controller@example.com',
        password: 'Password@123',
        firstName: 'Controller',
        lastName: 'Test',
        phoneNumber: '+1234567890',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should return 400 for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password@123',
        firstName: 'Duplicate',
        lastName: 'Test',
      };

      // Create first user
      await request(app).post('/auth/register').send(userData);

      // Try duplicate
      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'incomplete@example.com',
        // Missing password, firstName, lastName
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should set default role to patient', async () => {
      const userData = {
        email: 'defaultrole@example.com',
        password: 'Password@123',
        firstName: 'Default',
        lastName: 'Role',
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.role).toBe('patient');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Password@123',
          firstName: 'Login',
          lastName: 'Test',
        });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password@123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'Password@123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should include user-agent in device info', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('User-Agent', 'Test Browser')
        .send({
          email: 'login@example.com',
          password: 'Password@123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'refresh@example.com',
          password: 'Password@123',
          firstName: 'Refresh',
          lastName: 'Test',
        });

      refreshToken = response.body.data.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    let refreshToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'logout@example.com',
          password: 'Password@123',
          firstName: 'Logout',
          lastName: 'Test',
        });

      refreshToken = response.body.data.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeTruthy();
    });

    it('should handle logout with invalid token gracefully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      // Mock getUserProfile
      jest.spyOn(authService, 'getUserProfile').mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'patient',
      });

      const response = await request(app)
        .get('/auth/me')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data.email).toBe('test@example.com');
    });
  });
});

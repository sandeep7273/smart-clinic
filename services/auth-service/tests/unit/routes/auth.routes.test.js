/**
 * Unit Tests for Auth Routes
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
      modelFn.deleteMany = jest.fn().mockResolvedValue({});
      modelFn.prototype.save = jest.fn().mockResolvedValue();
      return modelFn;
    }),
    Types: { ObjectId: { isValid: jest.fn().mockReturnValue(true) } },
    set: jest.fn(),
  };
  return m;
});

const express = require('express');
const request = require('supertest');

// Mock dependencies
jest.mock('../../../src/controllers/auth.controller', () => ({
  register: jest.fn((req, res) => res.status(201).json({ success: true })),
  login: jest.fn((req, res) => res.status(200).json({ success: true })),
  refresh: jest.fn((req, res) => res.status(200).json({ success: true })),
  logout: jest.fn((req, res) => res.status(200).json({ success: true })),
  getMe: jest.fn((req, res) => res.status(200).json({ success: true })),
  getAllUsers: jest.fn((req, res) => res.status(200).json({ success: true })),
  healthCheck: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

jest.mock('../../../src/validators/auth.validator', () => ({
  validate: jest.fn(() => (req, res, next) => next()),
  registerSchema: {},
  loginSchema: {},
  refreshTokenSchema: {},
  logoutSchema: {},
}));

jest.mock('../../../src/middlewares/auth.middleware', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { userId: 'test-user', role: 'patient' };
    next();
  }),
}));

jest.mock('../../../src/middlewares/rateLimit.middleware', () => ({
  authLimiter: jest.fn((req, res, next) => next()),
  registerLimiter: jest.fn((req, res, next) => next()),
}));

jest.mock('../../../src/utils/logger.util', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const authController = require('../../../src/controllers/auth.controller');
const { validate } = require('../../../src/validators/auth.validator');
const { authenticate } = require('../../../src/middlewares/auth.middleware');
const { authLimiter, registerLimiter } = require('../../../src/middlewares/rateLimit.middleware');
const authRoutes = require('../../../src/routes/auth.routes');

describe('Auth Routes - Unit Tests', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh app for each test
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
  });

  describe('Public Routes', () => {
    describe('GET /auth/health', () => {
      it('should call healthCheck controller', async () => {
        await request(app)
          .get('/auth/health')
          .expect(200);

        expect(authController.healthCheck).toHaveBeenCalled();
      });

      it('should not require authentication', async () => {
        await request(app).get('/auth/health');

        expect(authenticate).not.toHaveBeenCalled();
      });
    });

    describe('POST /auth/register', () => {
      it('should call register controller', async () => {
        await request(app)
          .post('/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Password@123',
            firstName: 'Test',
            lastName: 'User',
          })
          .expect(201);

        expect(authController.register).toHaveBeenCalled();
      });

      it('should apply registerLimiter middleware', async () => {
        await request(app)
          .post('/auth/register')
          .send({});

        expect(registerLimiter).toHaveBeenCalled();
      });

      it('should apply validation middleware', async () => {
        await request(app)
          .post('/auth/register')
          .send({});

        expect(validate).toHaveBeenCalled();
      });

      it('should not require authentication', async () => {
        await request(app)
          .post('/auth/register')
          .send({});

        // authenticate should not be called for register
        expect(authenticate).not.toHaveBeenCalled();
      });
    });

    describe('POST /auth/login', () => {
      it('should call login controller', async () => {
        await request(app)
          .post('/auth/login')
          .send({
            email: 'test@example.com',
            password: 'Password@123',
          })
          .expect(200);

        expect(authController.login).toHaveBeenCalled();
      });

      it('should apply authLimiter middleware', async () => {
        await request(app)
          .post('/auth/login')
          .send({});

        expect(authLimiter).toHaveBeenCalled();
      });

      it('should apply validation middleware', async () => {
        await request(app)
          .post('/auth/login')
          .send({});

        expect(validate).toHaveBeenCalled();
      });

      it('should not require authentication', async () => {
        await request(app)
          .post('/auth/login')
          .send({});

        expect(authenticate).not.toHaveBeenCalled();
      });
    });

    describe('POST /auth/refresh', () => {
      it('should call refresh controller', async () => {
        await request(app)
          .post('/auth/refresh')
          .send({ refreshToken: 'test-token' })
          .expect(200);

        expect(authController.refresh).toHaveBeenCalled();
      });

      it('should apply validation middleware', async () => {
        await request(app)
          .post('/auth/refresh')
          .send({ refreshToken: 'test-token' });

        expect(validate).toHaveBeenCalled();
      });

      it('should not require authentication', async () => {
        await request(app)
          .post('/auth/refresh')
          .send({ refreshToken: 'test-token' });

        expect(authenticate).not.toHaveBeenCalled();
      });

      it('should not apply rate limiter', async () => {
        jest.clearAllMocks();
        
        await request(app)
          .post('/auth/refresh')
          .send({ refreshToken: 'test-token' });

        expect(authLimiter).not.toHaveBeenCalled();
        expect(registerLimiter).not.toHaveBeenCalled();
      });
    });

    describe('POST /auth/logout', () => {
      it('should call logout controller', async () => {
        await request(app)
          .post('/auth/logout')
          .send({ refreshToken: 'test-token' })
          .expect(200);

        expect(authController.logout).toHaveBeenCalled();
      });

      it('should apply validation middleware', async () => {
        await request(app)
          .post('/auth/logout')
          .send({ refreshToken: 'test-token' });

        expect(validate).toHaveBeenCalled();
      });

      it('should not require authentication', async () => {
        await request(app)
          .post('/auth/logout')
          .send({ refreshToken: 'test-token' });

        expect(authenticate).not.toHaveBeenCalled();
      });
    });

    describe('GET /auth/verify', () => {
      it('should call getMe controller', async () => {
        await request(app)
          .get('/auth/verify')
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(authController.getMe).toHaveBeenCalled();
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/auth/verify')
          .set('Authorization', 'Bearer test-token');

        expect(authenticate).toHaveBeenCalled();
      });
    });
  });

  describe('Protected Routes', () => {
    describe('GET /auth/me', () => {
      it('should call getMe controller', async () => {
        await request(app)
          .get('/auth/me')
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(authController.getMe).toHaveBeenCalled();
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/auth/me')
          .set('Authorization', 'Bearer test-token');

        expect(authenticate).toHaveBeenCalled();
      });

      it('should pass user from authenticate middleware', async () => {
        await request(app)
          .get('/auth/me')
          .set('Authorization', 'Bearer test-token');

        expect(authenticate).toHaveBeenCalled();
        expect(authController.getMe).toHaveBeenCalled();
      });
    });

    describe('GET /auth/all', () => {
      it('should call getAllUsers controller', async () => {
        await request(app)
          .get('/auth/all')
          .set('Authorization', 'Bearer test-token')
          .expect(200);

        expect(authController.getAllUsers).toHaveBeenCalled();
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/auth/all')
          .set('Authorization', 'Bearer test-token');

        expect(authenticate).toHaveBeenCalled();
      });
    });
  });

  describe('Route Methods', () => {
    it('should only accept POST for /auth/register', async () => {
      await request(app)
        .get('/auth/register')
        .expect(404);

      await request(app)
        .put('/auth/register')
        .expect(404);

      await request(app)
        .delete('/auth/register')
        .expect(404);
    });

    it('should only accept POST for /auth/login', async () => {
      await request(app)
        .get('/auth/login')
        .expect(404);

      await request(app)
        .put('/auth/login')
        .expect(404);
    });

    it('should only accept GET for /auth/me', async () => {
      await request(app)
        .post('/auth/me')
        .expect(404);

      await request(app)
        .put('/auth/me')
        .expect(404);
    });
  });

  describe('Middleware Order', () => {
    it('should apply rate limiter before validation for register', async () => {
      const callOrder = [];
      
      registerLimiter.mockImplementation((req, res, next) => {
        callOrder.push('rateLimiter');
        next();
      });
      
      validate.mockImplementation(() => (req, res, next) => {
        callOrder.push('validation');
        next();
      });

      await request(app)
        .post('/auth/register')
        .send({});

      expect(callOrder[0]).toBe('rateLimiter');
      expect(callOrder[1]).toBe('validation');
    });

    it('should apply authentication before controller for protected routes', async () => {
      const callOrder = [];
      
      authenticate.mockImplementation((req, res, next) => {
        callOrder.push('authenticate');
        req.user = { userId: 'test' };
        next();
      });
      
      authController.getMe.mockImplementation((req, res) => {
        callOrder.push('controller');
        res.json({ success: true });
      });

      await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer test-token');

      expect(callOrder[0]).toBe('authenticate');
      expect(callOrder[1]).toBe('controller');
    });
  });

  describe('Router Export', () => {
    it('should export express router', () => {
      const routes = require('../../../src/routes/auth.routes');
      expect(routes).toBeDefined();
      expect(typeof routes).toBe('function');
    });
  });
});

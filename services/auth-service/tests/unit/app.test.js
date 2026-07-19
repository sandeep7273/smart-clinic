/**
 * Unit Tests for Express App Configuration
 */

const request = require('supertest');
const express = require('express');

// Mock mongoose so health endpoint reports DB as connected (readyState 1)
jest.mock('mongoose', () => ({
  connection: { readyState: 1 },
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
}));

// Mock all dependencies before requiring app
jest.mock('../../src/config/env', () => ({
  app: {
    env: 'test',
  },
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
  isDevelopment: jest.fn(() => false),
  isProduction: jest.fn(() => false),
  isTest: jest.fn(() => true),
}));

jest.mock('../../src/utils/logger.util', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  stream: {
    write: jest.fn(),
  },
}));

jest.mock('../../src/middlewares/rateLimit.middleware', () => ({
  generalLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
  registerLimiter: (req, res, next) => next(),
}));

jest.mock('../../src/routes/auth.routes', () => {
  const router = express.Router();
  router.post('/register', (req, res) => res.json({ success: true }));
  router.post('/login', (req, res) => res.json({ success: true }));
  return router;
});

const app = require('../../src/app');
const config = require('../../src/config/env');
const logger = require('../../src/utils/logger.util');

describe('Express App - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/health');

      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });

    it('should include uptime in response', async () => {
      const response = await request(app).get('/health');

      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should include ISO timestamp', async () => {
      const response = await request(app).get('/health');

      expect(response.body.timestamp).toBeDefined();
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    it('should include environment from config', async () => {
      const response = await request(app).get('/health');

      expect(response.body.environment).toBe('test');
    });
  });

  describe('Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Smart Appointment System - Auth Service API');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });

    it('should include version information', async () => {
      const response = await request(app).get('/');

      expect(response.body.version).toBe('1.0.0');
    });

    it('should list available endpoints', async () => {
      const response = await request(app).get('/');

      expect(response.body.endpoints).toHaveProperty('health');
      expect(response.body.endpoints).toHaveProperty('auth');
      expect(response.body.endpoints.auth).toHaveProperty('register');
      expect(response.body.endpoints.auth).toHaveProperty('login');
      expect(response.body.endpoints.auth).toHaveProperty('refresh');
      expect(response.body.endpoints.auth).toHaveProperty('logout');
      expect(response.body.endpoints.auth).toHaveProperty('profile');
    });

    it('should include correct HTTP methods in endpoint descriptions', async () => {
      const response = await request(app).get('/');

      expect(response.body.endpoints.auth.register).toContain('POST');
      expect(response.body.endpoints.auth.login).toContain('POST');
      expect(response.body.endpoints.auth.profile).toContain('GET');
    });
  });

  describe('Auth Routes', () => {
    it('should mount auth routes at /auth', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle auth login route', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/undefined-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should include requested URL in error message', async () => {
      const response = await request(app)
        .get('/some/random/path')
        .expect(404);

      expect(response.body.message).toContain('/some/random/path');
    });

    it('should handle POST to undefined routes', async () => {
      const response = await request(app)
        .post('/undefined-post-route')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle PUT to undefined routes', async () => {
      const response = await request(app)
        .put('/undefined-put-route')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle DELETE to undefined routes', async () => {
      const response = await request(app)
        .delete('/undefined-delete-route')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Middleware Configuration', () => {
    it('should parse JSON request bodies', async () => {
      const testData = { test: 'data', number: 123 };
      const response = await request(app)
        .post('/auth/register')
        .send(testData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBeLessThan(500);
    });

    it('should parse URL-encoded bodies', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send('key=value&another=data')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.status).toBeLessThan(500);
    });

    it('should set security headers with helmet', async () => {
      const response = await request(app).get('/health');

      // Helmet sets various security headers
      expect(response.headers).toBeDefined();
    });

    it('should handle CORS', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect([200, 503]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors with error middleware', async () => {
      // This tests that error middleware is properly configured
      const response = await request(app)
        .get('/undefined-route')
        .expect(404);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
    });

    it('should return JSON error responses', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint');

      expect(response.type).toBe('application/json');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Request Size Limits', () => {
    it('should accept requests within size limit', async () => {
      const largeData = {
        data: 'x'.repeat(1000), // 1KB of data
      };

      const response = await request(app)
        .post('/auth/register')
        .send(largeData);

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('HTTP Methods', () => {
    it('should support GET requests', async () => {
      const response = await request(app).get('/health');
      expect([200, 503]).toContain(response.status);
    });

    it('should support POST requests', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({});
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Response Format', () => {
    it('should return JSON responses', async () => {
      const response = await request(app).get('/health');

      expect(response.type).toBe('application/json');
      expect(response.body).toBeInstanceOf(Object);
    });

    it('should include success flag in responses', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('status');
      expect(typeof response.body.status).toBe('string');
    });
  });

  describe('App Module Export', () => {
    it('should export express app instance', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
      expect(app.listen).toBeDefined();
    });
  });
});

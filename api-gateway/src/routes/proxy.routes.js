/**
 * REST API Proxy Routes
 * Proxies requests to backend microservices
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');
const { authenticate, optionalAuthenticate, authorize } = require('../middleware/auth.middleware');
const { generalRateLimiter, authRateLimiter } = require('../middleware/rateLimiter.middleware');
const logger = require('../utils/logger');
const { getCorrelationId } = require('../utils/correlationId');

const router = express.Router();

/**
 * Create proxy configuration for a service
 */
const createProxyConfig = (serviceName, serviceUrl) => {
  return {
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/${serviceName}`]: `/${serviceName}`, // Replace /api/{service} with /{service}
    },
    timeout: 30000, // 30 second timeout
    proxyTimeout: 30000,
    onProxyReq: (proxyReq, req, res) => {
      // Forward correlation ID
      const correlationId = getCorrelationId(req);
      proxyReq.setHeader('x-correlation-id', correlationId);

      // Forward user info from JWT
      if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.userId || req.user.id);
        proxyReq.setHeader('x-user-email', req.user.email);
        proxyReq.setHeader('x-user-role', req.user.role);
        if (req.user.tenantId) {
          proxyReq.setHeader('x-tenant-id', req.user.tenantId);
        }
      }

      // Restream parsed body for POST/PUT/PATCH requests
      // This is necessary because body-parser consumes the stream
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }

      // Log proxy request
      logger.debug('Proxying request', {
        correlationId,
        service: serviceName,
        method: req.method,
        path: req.originalUrl,
        target: `${serviceUrl}${req.path}`,
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log proxy response
      const correlationId = getCorrelationId(req);
      logger.debug('Proxy response received', {
        correlationId,
        service: serviceName,
        statusCode: proxyRes.statusCode,
        path: req.originalUrl,
      });
    },
    onError: (err, req, res) => {
      const correlationId = getCorrelationId(req);
      logger.error('Proxy error', {
        correlationId,
        service: serviceName,
        error: err.message,
        path: req.originalUrl,
      });

      res.status(503).json({
        success: false,
        message: `${serviceName} service is unavailable`,
        correlationId,
      });
    },
  };
};

/**
 * Auth Service Proxy
 * Public endpoints: /api/auth/register, /api/auth/login, /api/auth/refresh
 * Protected endpoints: /api/auth/logout, /api/auth/verify, /api/auth/me
 */
router.use(
  '/auth/register',
  authRateLimiter,
  createProxyMiddleware(createProxyConfig('auth', config.services.auth))
);

router.use(
  '/auth/login',
  authRateLimiter,
  createProxyMiddleware(createProxyConfig('auth', config.services.auth))
);

// Refresh endpoint should be public (only requires refresh token in body)
router.use(
  '/auth/refresh',
  authRateLimiter,
  createProxyMiddleware(createProxyConfig('auth', config.services.auth))
);

// All other auth endpoints require authentication
router.use(
  '/auth',
  authenticate,
  generalRateLimiter,
  createProxyMiddleware(createProxyConfig('auth', config.services.auth))
);

/**
 * Patient Service Proxy
 * All endpoints require authentication
 */
router.use(
  '/patient',
  authenticate,
  generalRateLimiter,
  createProxyMiddleware(createProxyConfig('patient', config.services.patient))
);

/**
 * Doctor Service Proxy
 * Public endpoints: GET /api/doctor (list), GET /api/doctor/:id
 * Protected endpoints: POST, PUT, DELETE (admin/doctor only)
 */
router.use(
  '/doctor',
  optionalAuthenticate,
  generalRateLimiter,
  (req, res, next) => {
    // Allow GET requests without authentication
    if (req.method === 'GET') {
      return next();
    }
    // Require authentication for write operations
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }
    next();
  },
  createProxyMiddleware(createProxyConfig('doctor', config.services.doctor))
);

/**
 * Appointment Service Proxy
 * All endpoints require authentication
 * Patients can only access their own appointments
 * Doctors can access appointments assigned to them
 */
router.use(
  '/appointment',
  authenticate,
  generalRateLimiter,
  createProxyMiddleware(createProxyConfig('appointment', config.services.appointment))
);

/**
 * Notification Service Proxy
 * All endpoints require authentication
 */
router.use(
  '/notification',
  authenticate,
  generalRateLimiter,
  createProxyMiddleware(createProxyConfig('notification', config.services.notification))
);

/**
 * Search Service Proxy
 * Public endpoints: GET /api/search/doctors
 * Protected endpoints require authentication
 */
router.use(
  '/search',
  optionalAuthenticate,
  generalRateLimiter,
  createProxyMiddleware(createProxyConfig('search', config.services.search))
);

module.exports = router;

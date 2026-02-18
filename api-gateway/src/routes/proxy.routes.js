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

router.use(
  '/auth/verify',
  createProxyMiddleware(createProxyConfig('auth', config.services.auth))
);

// All other auth endpoints require authentication
router.use(
  '/auth',
  authenticate,
  generalRateLimiter,
  createProxyMiddleware(createProxyConfig('auth', config.services.auth))
);


module.exports = router;

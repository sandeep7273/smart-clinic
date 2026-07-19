const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (req, res) => {
  const health = {
    service: 'doctor-service',
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };

  const statusCode = health.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness check endpoint
 * GET /health/ready
 */
router.get('/ready', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({
      status: 'ready',
      database: 'connected',
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      database: 'disconnected',
    });
  }
});

/**
 * Liveness check endpoint
 * GET /health/live
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

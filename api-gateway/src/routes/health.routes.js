/**
 * Health Check Routes
 * Service health and readiness endpoints
 */

const express = require("express");
const { createServiceClients } = require("../services/serviceClient");
const { asyncHandler } = require("../middleware/error.middleware");
const config = require("../config");

const router = express.Router();

/**
 * Basic health check
 * GET /health
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Gateway is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
  });
});

/**
 * Readiness check
 * GET /ready
 */
router.get(
  "/ready",
  asyncHandler(async (req, res) => {
    const clients = createServiceClients();
    const criticalServices = ["auth"]; // Add other critical services

    // Check critical services
    const checks = await Promise.all(
      criticalServices
        .filter((service) => clients[service])
        .map(async (service) => {
          try {
            const health = await clients[service].healthCheck();
            return { service, healthy: health.healthy };
          } catch (error) {
            return { service, healthy: false };
          }
        }),
    );

    const allHealthy = checks.every((check) => check.healthy);

    if (allHealthy) {
      res.status(200).json({
        success: true,
        message: "API Gateway is ready",
        services: checks,
      });
    } else {
      res.status(503).json({
        success: false,
        message: "API Gateway is not ready",
        services: checks,
      });
    }
  }),
);

/**
 * Detailed status check
 * GET /status
 */
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const clients = createServiceClients();
    const allServices = Object.keys(clients);

    // Check all services
    const serviceStatuses = await Promise.all(
      allServices.map(async (serviceName) => {
        try {
          const health = await clients[serviceName].healthCheck();
          return {
            name: serviceName,
            url: config.services[serviceName],
            healthy: health.healthy,
            status: health.status,
            message: health.data?.message,
          };
        } catch (error) {
          return {
            name: serviceName,
            url: config.services[serviceName],
            healthy: false,
            error: error.message,
          };
        }
      }),
    );

    const healthyCount = serviceStatuses.filter((s) => s.healthy).length;
    const totalCount = serviceStatuses.length;

    res.status(200).json({
      success: true,
      gateway: {
        healthy: true,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: config.app.env,
      },
      services: serviceStatuses,
      summary: {
        total: totalCount,
        healthy: healthyCount,
        unhealthy: totalCount - healthyCount,
      },
    });
  }),
);

/**
 * Liveness probe — ECS restarts container if this fails
 * GET /live
 */
router.get("/live", (_req, res) => {
  res
    .status(200)
    .json({ status: "ALIVE", timestamp: new Date().toISOString() });
});

module.exports = router;

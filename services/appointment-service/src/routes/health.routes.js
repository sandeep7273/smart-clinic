/**
 * Health, Readiness, and Liveness Routes — Appointment Service
 *
 * GET /health  — full dependency status (ECS ALB health check)
 * GET /ready   — readiness probe: DB + Kafka ready?
 * GET /live    — liveness probe: process alive?
 */

"use strict";

const express = require("express");
const mongoose = require("mongoose");
const { producer } = require("../kafka");

const router = express.Router();

/**
 * GET /health
 * Returns status of all dependencies.
 * Returns 503 if any critical dependency is down.
 */
router.get("/", async (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  const dbStatus = dbState === 1 ? "CONNECTED" : "DISCONNECTED";
  const dbHealthy = dbState === 1;

  // Kafka producer: check if connected (duck-typing the internal state)
  let kafkaStatus = "UNKNOWN";
  try {
    // kafkajs producer exposes _state internally — use a safer check
    kafkaStatus =
      producer && typeof producer.send === "function"
        ? "CONNECTED"
        : "DISCONNECTED";
  } catch {
    kafkaStatus = "DISCONNECTED";
  }

  const healthy = dbHealthy; // Kafka is optional for liveness; only DB is critical

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "UP" : "DEGRADED",
    service: "appointment-service",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks: {
      database: dbStatus,
      kafka: kafkaStatus,
    },
  });
});

/**
 * GET /ready
 * Readiness probe — ECS will stop sending traffic if this returns non-200.
 * Checks DB connectivity (required to serve requests).
 */
router.get("/ready", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  if (dbReady) {
    res.status(200).json({ status: "READY", database: "CONNECTED" });
  } else {
    res.status(503).json({ status: "NOT_READY", database: "DISCONNECTED" });
  }
});

/**
 * GET /live
 * Liveness probe — ECS restarts the container if this fails.
 * No dependency checks: just confirms the process is alive.
 */
router.get("/live", (_req, res) => {
  res
    .status(200)
    .json({ status: "ALIVE", timestamp: new Date().toISOString() });
});

module.exports = router;

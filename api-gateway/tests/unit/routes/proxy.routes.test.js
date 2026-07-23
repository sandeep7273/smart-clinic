/**
 * Unit Tests for REST proxy routes
 */

jest.mock("../../../src/middleware/auth.middleware", () => ({
  authenticate: () => (_req, _res, next) => next(),
  optionalAuthenticate: () => (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
}));

jest.mock("../../../src/middleware/rateLimiter.middleware", () => ({
  generalRateLimiter: (_req, _res, next) => next(),
  authRateLimiter: (_req, _res, next) => next(),
}));

jest.mock("../../../src/utils/logger", () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

describe("REST proxy route path rewriting", () => {
  const { rewriteServicePath } = require("../../../src/routes/proxy.routes");

  it("forwards login to the auth service route even when mounted below /api", () => {
    const rewrite = rewriteServicePath("auth");

    expect(rewrite("/", { originalUrl: "/api/auth/login" })).toBe(
      "/auth/login",
    );
  });

  it("preserves query strings when forwarding auth routes", () => {
    const rewrite = rewriteServicePath("auth");

    expect(rewrite("/", { originalUrl: "/api/auth/verify?token=abc123" })).toBe(
      "/auth/verify?token=abc123",
    );
  });
});

# API Gateway

Enterprise-grade API Gateway for the Smart Appointment System microservices architecture. Provides GraphQL schema stitching, REST API proxying, authentication, rate limiting, circuit breakers, and comprehensive observability.

## Features

- **GraphQL Schema Stitching**: Unified GraphQL interface across all microservices
- **REST API Proxy**: HTTP proxy with service-specific routing
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Rate Limiting**: Configurable rate limits per endpoint
- **Circuit Breakers**: Automatic failure detection and recovery
- **Request Caching**: In-memory caching for improved performance
- **Distributed Tracing**: Correlation ID propagation across services
- **Health Checks**: Comprehensive health and readiness endpoints
- **Security**: Helmet, CORS, input validation
- **Observability**: Winston logging with correlation IDs

## Architecture

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         API Gateway (Port 3000)     │
├─────────────────────────────────────┤
│  GraphQL Endpoint (/graphql)        │
│  REST API Proxy (/api/*)            │
│  Health Checks (/health, /ready)    │
├─────────────────────────────────────┤
│  Middleware Stack:                  │
│  - Correlation ID                   │
│  - Authentication (JWT)             │
│  - Rate Limiting                    │
│  - Caching                          │
│  - Logging                          │
│  - Error Handling                   │
├─────────────────────────────────────┤
│  Circuit Breakers (Opossum)         │
│  Service Clients (Axios)            │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│        Microservices                │
├─────────────────────────────────────┤
│  - Auth Service (4001)              │
│  - Patient Service (4002)           │
│  - Doctor Service (4003)            │
│  - Appointment Service (4004)       │
│  - Notification Service (4005)      │
│  - Search Service (4006)            │
└─────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Running microservices (at least Auth Service)
- Environment configuration

### Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Configuration

Edit `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Service URLs
GW_AUTH_SERVICE_URL=http://localhost:4001
PATIENT_SERVICE_URL=http://localhost:4002
DOCTOR_SERVICE_URL=http://localhost:4003
APPOINTMENT_SERVICE_URL=http://localhost:4004
NOTIFICATION_SERVICE_URL=http://localhost:4005
SEARCH_SERVICE_URL=http://localhost:4006

# JWT Configuration
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Circuit Breaker
CIRCUIT_BREAKER_TIMEOUT=3000
CIRCUIT_BREAKER_ERROR_THRESHOLD=50
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
```

### Running

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## API Endpoints

### Health Checks

#### Basic Health Check

```http
GET /health
```

Response:

```json
{
  "success": true,
  "message": "API Gateway is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

#### Readiness Check

```http
GET /ready
```

Response:

```json
{
  "success": true,
  "message": "API Gateway is ready",
  "services": [{ "service": "auth", "healthy": true }]
}
```

#### Detailed Status

```http
GET /status
```

Response:

```json
{
  "success": true,
  "gateway": {
    "healthy": true,
    "uptime": 3600,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "environment": "development"
  },
  "services": [
    {
      "name": "auth",
      "url": "http://localhost:4001",
      "healthy": true,
      "status": 200,
      "message": "Auth Service is healthy"
    }
  ],
  "summary": {
    "total": 6,
    "healthy": 1,
    "unhealthy": 5
  }
}
```

### GraphQL Endpoint

```http
POST /graphql
Content-Type: application/json
Authorization: Bearer <token>
```

Request:

```json
{
  "query": "query { users { id email name } }",
  "variables": {}
}
```

GraphQL Playground available at: http://localhost:3000/graphql (development only)

### REST API Proxy

All REST API endpoints are proxied through `/api/{service}/{path}`.

#### Auth Service

```http
# Register
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "patient"
}

# Login
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

# Logout (requires auth)
POST /api/auth/logout
Authorization: Bearer <token>

# Refresh token (requires auth)
POST /api/auth/refresh
Authorization: Bearer <token>
```

#### Patient Service

```http
# Get patient profile (requires auth)
GET /api/patient/profile
Authorization: Bearer <token>

# Update patient profile (requires auth)
PUT /api/patient/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "phone": "+1234567890"
}
```

#### Doctor Service

```http
# List doctors (public)
GET /api/doctor?specialization=cardiology

# Get doctor details (public)
GET /api/doctor/:id

# Create doctor (requires admin auth)
POST /api/doctor
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Dr. Smith",
  "specialization": "cardiology",
  "experience": 10
}
```

#### Appointment Service

```http
# List appointments (requires auth)
GET /api/appointment
Authorization: Bearer <token>

# Create appointment (requires auth)
POST /api/appointment
Authorization: Bearer <token>
Content-Type: application/json

{
  "doctorId": "123",
  "date": "2024-01-20",
  "time": "10:00",
  "reason": "Checkup"
}
```

## Authentication

The API Gateway uses JWT-based authentication. Include the JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Token Flow

1. Client calls `/api/auth/login` or `/api/auth/register`
2. Auth service returns access and refresh tokens
3. Client includes access token in subsequent requests
4. Gateway validates token and extracts user info
5. Gateway forwards user info to downstream services via headers:
   - `x-user-id`: User ID
   - `x-user-email`: User email
   - `x-user-role`: User role
   - `x-tenant-id`: Tenant ID (if applicable)

## Rate Limiting

Different rate limits apply to different endpoints:

- **General Endpoints**: 100 requests per 15 minutes
- **Auth Endpoints** (login/register): 5 requests per 15 minutes
- **GraphQL Endpoint**: 200 requests per 15 minutes

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## Circuit Breakers

Circuit breakers protect the gateway from cascading failures:

- **Timeout**: 3 seconds
- **Error Threshold**: 50% (opens circuit after 50% errors)
- **Reset Timeout**: 30 seconds (tries to close after 30s)

Circuit states:

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Too many failures, requests immediately fail
- **HALF_OPEN**: Testing if service recovered

## Distributed Tracing

Every request gets a unique correlation ID:

```http
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```

The correlation ID is:

- Generated if not provided
- Propagated to all downstream services
- Included in all logs
- Returned in response headers

## Caching

GET requests can be cached for improved performance:

```javascript
// Cache configuration
const cache = {
  ttl: 300, // 5 minutes
  checkPeriod: 600, // 10 minutes
};

// Cache key includes:
// - User ID (if authenticated)
// - Request path
// - Query parameters
```

Cache headers:

```http
X-Cache: HIT  # or MISS
X-Cache-TTL: 300
```

## Error Handling

The gateway returns consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

HTTP Status Codes:

- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `503`: Service Unavailable (circuit breaker open)
- `504`: Gateway Timeout

## Logging

Winston logger with multiple transports:

```javascript
// Log levels
logger.error("Error message", { context });
logger.warn("Warning message", { context });
logger.info("Info message", { context });
logger.debug("Debug message", { context });
```

Log files:

- `logs/error.log`: Error logs only
- `logs/combined.log`: All logs

All logs include:

- Timestamp
- Log level
- Correlation ID
- Message
- Context data

## Project Structure

```
api-gateway/
├── src/
│   ├── config/
│   │   └── index.js              # Centralized configuration
│   ├── graphql/
│   │   ├── context.js            # GraphQL context
│   │   ├── resolvers.js          # Base resolvers
│   │   ├── schema.js             # Base schema
│   │   └── stitchSchemas.js      # Schema stitching
│   ├── middleware/
│   │   ├── auth.middleware.js    # Authentication & authorization
│   │   ├── correlationId.middleware.js
│   │   ├── error.middleware.js   # Error handling
│   │   ├── logging.middleware.js # Request logging
│   │   └── rateLimiter.middleware.js
│   ├── routes/
│   │   ├── health.routes.js      # Health check endpoints
│   │   └── proxy.routes.js       # REST API proxy
│   ├── services/
│   │   ├── cache.js              # In-memory caching
│   │   ├── circuitBreaker.js     # Circuit breaker
│   │   └── serviceClient.js      # HTTP client
│   ├── utils/
│   │   ├── correlationId.js      # Correlation ID utilities
│   │   ├── errors.js             # Custom error classes
│   │   ├── jwt.js                # JWT utilities
│   │   └── logger.js             # Winston logger
│   └── index.js                  # Main server file
├── logs/                         # Log files
├── .env                          # Environment variables
├── .env.example                  # Example environment
├── package.json                  # Dependencies
└── README.md                     # This file
```

## Development

### Adding a New Service

1. Add service URL to `.env`:

```env
NEW_SERVICE_URL=http://localhost:4007
```

2. Add to `config/index.js`:

```javascript
services: {
  // ... existing services
  newService: process.env.NEW_SERVICE_URL,
}
```

3. Add to `services/serviceClient.js`:

```javascript
const clients = {
  // ... existing clients
  newService: new ServiceClient(config.services.newService, "new-service"),
};
```

4. Add proxy route in `routes/proxy.routes.js`:

```javascript
router.use(
  "/new-service",
  authenticate,
  generalRateLimiter,
  createProxyMiddleware(
    createProxyConfig("new-service", config.services.newService),
  ),
);
```

5. Add to GraphQL stitching in `graphql/stitchSchemas.js`:

```javascript
const graphqlServices = [
  // ... existing services
  { name: "newService", url: `${config.services.newService}/graphql` },
];
```

### Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test with authentication
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/patient/profile

# Test GraphQL
curl -X POST http://localhost:3000/graphql \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"query":"{ users { id email } }"}'
```

## Monitoring

### Metrics to Monitor

- Request rate (requests/second)
- Error rate (errors/total requests)
- Response time (p50, p95, p99)
- Circuit breaker state
- Cache hit rate
- Service health status

### Health Check Endpoints

- `/health`: Basic liveness check
- `/ready`: Readiness check (includes critical services)
- `/status`: Detailed status of all services

## Security

### Best Practices

- Always use HTTPS in production
- Keep JWT secrets secure
- Rotate secrets regularly
- Set appropriate rate limits
- Enable CORS only for trusted origins
- Validate all inputs
- Keep dependencies updated
- Monitor for security vulnerabilities

### Environment-Specific Settings

Development:

- GraphQL playground enabled
- Detailed error messages
- Debug logging

Production:

- GraphQL playground disabled
- Generic error messages
- Info/error logging only
- Stricter rate limits

## Troubleshooting

### Common Issues

**Service Unavailable (503)**

- Check if downstream service is running
- Check circuit breaker status
- Verify service URLs in `.env`

**Unauthorized (401)**

- Verify JWT token is valid
- Check JWT_ACCESS_SECRET matches auth service
- Ensure token is not expired

**Rate Limit Exceeded (429)**

- Wait for rate limit window to reset
- Check rate limit configuration
- Consider increasing limits for your use case

**Gateway Timeout (504)**

- Check service response times
- Increase CIRCUIT_BREAKER_TIMEOUT
- Check network connectivity

### Debugging

Enable debug logging:

```env
LOG_LEVEL=debug
```

Check logs:

```bash
tail -f logs/combined.log
tail -f logs/error.log
```

Test service connectivity:

```bash
curl http://localhost:4001/health
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Include correlation IDs in logs
5. Handle errors gracefully

## License

MIT

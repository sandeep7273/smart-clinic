# Doctor Service - Developer Guide

## Overview

This guide provides technical details for developers working with or integrating with the Doctor Service.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [API Design Patterns](#api-design-patterns)
6. [Middleware Pipeline](#middleware-pipeline)
7. [Error Handling](#error-handling)
8. [Validation](#validation)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Performance Optimization](#performance-optimization)
12. [Security](#security)

---

## Architecture

### Microservice Architecture

The Doctor Service follows a **Database per Service** pattern:

```
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (Port 3000)               │
└────────────┬────────────────────────────────────────────┘
             │
      /api/doctor/*
             │
┌────────────▼────────────────────────────────────────────┐
│          Doctor Service (Port 4003)                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │              REST API Routes                    │   │
│  │  /api/doctor/search                            │   │
│  │  /api/doctor/filters/options                   │   │
│  │  /api/doctor/:id                               │   │
│  │  /api/doctor/me/profile (protected)            │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Middleware Pipeline                   │   │
│  │  - Authentication & Authorization              │   │
│  │  - Input Validation                            │   │
│  │  - Error Handling                              │   │
│  │  - Rate Limiting                               │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Service Layer                         │   │
│  │  - Business Logic                              │   │
│  │  - Database Operations                         │   │
│  │  - External Service Integration                │   │
│  └─────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│        MongoDB (doctor_db)                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Collections:                                   │   │
│  │  - doctors (Doctor documents)                   │   │
│  │  - Text indexes (full-text search)              │   │
│  │  - Compound indexes (query optimization)        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Request/Response Flow

```
Client Request
    ↓
API Gateway (Rate Limiting, Correlation ID)
    ↓
Doctor Service Router
    ↓
Middleware Pipeline:
  1. Authentication (extract token)
  2. Optional Authentication (attach user if available)
  3. Input Validation (validate request body/params)
  4. Authorization Check (verify user role)
    ↓
Controller (Request Handling)
    ↓
Service Layer (Business Logic)
    ↓
Model Layer (Database Operations)
    ↓
MongoDB
    ↓
Response Back Through Pipeline
    ↓
Client Response
```

---

## Project Structure

```
services/doctor-service/
├── src/
│   ├── config/
│   │   ├── index.js              # Configuration management
│   │   └── database.js           # MongoDB connection
│   ├── models/
│   │   └── Doctor.js             # Doctor schema & model
│   ├── controllers/
│   │   └── doctor.controller.js  # Request handlers
│   ├── services/
│   │   └── doctor.service.js     # Business logic
│   ├── routes/
│   │   ├── doctor.routes.js      # API endpoints
│   │   └── health.routes.js      # Health checks
│   ├── middlewares/
│   │   ├── auth.middleware.js    # JWT validation
│   │   ├── rbac.middleware.js    # Role-based access
│   │   ├── validator.middleware.js  # Input validation
│   │   └── error.middleware.js   # Error handling
│   ├── utils/
│   │   ├── logger.js             # Winston logger
│   │   ├── errors.js             # Custom error classes
│   │   └── auth.js               # Auth service integration
│   ├── scripts/
│   │   └── seed.js               # Sample data seeding
│   ├── graphql/                  # (Future: GraphQL support)
│   └── server.js                 # Express app setup
├── .env                          # Environment variables
├── .env.example                  # Example environment variables
├── package.json                  # Dependencies
├── README.md                     # Project documentation
├── QUICK_START.md               # Quick start guide
└── DOCTOR_SERVICE_API.md        # API documentation
```

---

## Technology Stack

### Core

- **Runtime:** Node.js v20.19.4
- **Framework:** Express.js 4.19.2
- **Database:** MongoDB 8.x
- **ODM:** Mongoose 8.3.0

### Middleware & Security

- **CORS:** cors 2.8.5
- **Helmet:** helmet 7.1.0 (security headers)
- **Logging:** morgan 1.10.0, winston 3.13.0
- **Validation:** express-validator 7.0.1

### APIs & Documentation

- **API Documentation:** swagger-ui-express 5.0.0, swagger-jsdoc 6.2.8
- **HTTP Client:** axios 1.6.8 (for external service calls)

### Future/Optional

- **GraphQL:** apollo-server-express 3.13.0, graphql 16.8.1
- **Event Bus:** kafkajs 2.2.4 (for event-driven architecture)

### Development

- **Hot Reload:** nodemon 3.1.0
- **Environment:** dotenv 16.4.5

---

## Database Design

### MongoDB Collections

#### doctors Collection

**Schema:**

```javascript
{
  // User Reference
  _id: ObjectId,
  userId: String (unique, indexed),          // Reference to auth service user

  // Basic Information
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique, indexed),
  phone: String (required),
  dateOfBirth: Date (optional),
  gender: String (enum: male|female|other),

  // Professional Information
  specializations: [String] (indexed),       // E.g., ["Cardiology", "Internal Medicine"]
  subSpecialties: [String],                  // E.g., ["Interventional Cardiology"]
  licenseNumber: String (required),
  yearsOfExperience: Number,

  // Searchable Medical Info
  treatedConditions: [String] (indexed),     // E.g., ["Hypertension", "Heart Disease"]
  treatedSymptoms: [String] (indexed),       // E.g., ["Chest Pain", "Fatigue"]

  // Profile
  bio: String (maxLength: 2000),
  profilePicture: String (URL),
  languages: [String],                       // E.g., ["English", "Spanish"]

  // Location
  address: {
    street: String,
    city: String (indexed),
    state: String (indexed),
    zipCode: String,
    country: String
  },

  // Qualifications
  qualifications: [{
    degree: String,                          // E.g., "MD", "DO", "MBBS"
    institution: String,
    year: Number,
    field: String
  }],

  // Licenses
  licenses: [{
    licenseNumber: String,
    issuingAuthority: String,
    state: String,
    expiryDate: Date,
    isActive: Boolean
  }],

  // Certifications
  certifications: [{
    name: String,
    issuingBody: String,
    expiryDate: Date
  }],

  // Schedule
  weeklySchedule: [{
    dayOfWeek: Number (0-6),                 // 0 = Sunday
    isAvailable: Boolean,
    startTime: String (HH:MM format),
    endTime: String (HH:MM format),
    breaks: [{
      startTime: String,
      endTime: String
    }]
  }],

  // Availability Slots
  availabilitySlots: [{
    date: Date (indexed),
    startTime: String,
    endTime: String,
    status: String (enum: available|booked|cancelled|completed, indexed),
    appointmentId: ObjectId (ref to Appointment),
    notes: String,
    createdAt: Date,
    updatedAt: Date
  }],

  // Consultation Details
  consultationFee: Number,
  consultationDuration: Number (minutes),
  acceptsInsurance: Boolean,
  insuranceProviders: [String],

  // Ratings & Reviews
  rating: Number (0-5),
  reviewCount: Number,

  // Status
  status: String (enum: active|inactive|on_leave|suspended),
  isAvailable: Boolean,
  tenantId: String (default: "default-tenant"),
  isDeleted: Boolean (soft delete),

  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  __v: Number (Mongoose versioning)
}
```

### Indexes

**Text Indexes (Full-Text Search):**

```javascript
doctorSchema.index({
  firstName: "text",
  lastName: "text",
  specializations: "text",
  treatedConditions: "text",
  treatedSymptoms: "text",
  "address.city": "text",
  "address.state": "text",
  bio: "text",
});
```

**Compound Indexes (Query Optimization):**

```javascript
// Specialty + Location + Status (most common query)
doctorSchema.index({ specializations: 1, "address.city": 1, status: 1 });

// Specialty + Availability + Status
doctorSchema.index({ specializations: 1, isAvailable: 1, status: 1 });

// Location + Status
doctorSchema.index({ "address.city": 1, status: 1 });

// Treated Conditions + Status
doctorSchema.index({ treatedConditions: 1, status: 1 });

// Treated Symptoms + Status
doctorSchema.index({ treatedSymptoms: 1, status: 1 });
```

**Single Field Indexes:**

```javascript
// Unique indexes
userId: { unique: true, sparse: true }
email: { unique: true, lowercase: true }

// Regular indexes
'address.city': 1
'address.state': 1
availabilitySlots.date: 1
availabilitySlots.status: 1
```

---

## API Design Patterns

### RESTful Convention

```
GET    /api/doctor              → List/Search
GET    /api/doctor/:id          → Get by ID
POST   /api/doctor              → Create
PUT    /api/doctor/:id          → Update
DELETE /api/doctor/:id          → Delete
PATCH  /api/doctor/:id/slots/:slotId → Partial update
```

### Response Format

**Success Response:**

```json
{
  "success": true,
  "data": {
    /* payload */
  },
  "message": "Optional success message",
  "pagination": {
    /* optional */
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Human readable message",
  "details": [
    {
      "field": "fieldName",
      "message": "Field-specific error"
    }
  ]
}
```

### Status Codes

| Code | Usage                                |
| ---- | ------------------------------------ |
| 200  | GET, PUT, PATCH success              |
| 201  | POST success (resource created)      |
| 400  | Bad request / validation error       |
| 401  | Unauthorized (missing/invalid token) |
| 403  | Forbidden (insufficient permissions) |
| 404  | Not found                            |
| 409  | Conflict (duplicate resource)        |
| 500  | Internal server error                |
| 503  | Service unavailable                  |

---

## Middleware Pipeline

### Middleware Order

```javascript
// Global Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json()); // Body parser
app.use(morgan()); // HTTP logging

// API Routes Middleware
app.use("/api", authenticate); // JWT validation
app.use("/api", roleValidator); // Role checking
app.use("/api", inputValidator); // Schema validation
app.use("/api/doctor", doctorRoutes); // Routes

// Error Middleware (last)
app.use(notFoundHandler);
app.use(errorHandler);
```

### Custom Middleware

#### Authentication (`auth.middleware.js`)

```javascript
authenticate(req, res, next); // Required auth
optionalAuth(req, res, next); // Optional auth
```

#### Authorization (`rbac.middleware.js`)

```javascript
requireRole("doctor", "admin")(req, res, next);
requireOwnership(req, res, next); // Owner verification
```

#### Validation (`validator.middleware.js`)

```javascript
createDoctorValidation; // Validate POST /doctor
updateDoctorValidation; // Validate PUT /doctor/:id
searchDoctorValidation; // Validate search params
idValidation; // Validate MongoDB ObjectId
```

---

## Error Handling

### Custom Error Classes

```javascript
// src/utils/errors.js

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {} // 400
class NotFoundError extends AppError {} // 404
class UnauthorizedError extends AppError {} // 401
class ForbiddenError extends AppError {} // 403
class ConflictError extends AppError {} // 409
class InternalServerError extends AppError {} // 500
```

### Error Middleware

```javascript
// src/middlewares/error.middleware.js

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error("Error:", err);

  // Determine status code
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Send response
  res.status(statusCode).json({
    success: false,
    error: err.constructor.name,
    message,
    details: err.details || [],
  });
};
```

---

## Validation

### Input Validation Strategy

Uses `express-validator` with custom rules:

```javascript
// src/middlewares/validator.middleware.js

const { body, param, query, validationResult } = require("express-validator");

const createDoctorValidation = [
  body("firstName").trim().notEmpty().withMessage("First name required"),
  body("lastName").trim().notEmpty().withMessage("Last name required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("specializations")
    .isArray()
    .notEmpty()
    .withMessage("At least one specialization required"),
  body("address.city").notEmpty().withMessage("City required"),

  // Validation error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new ValidationError("Validation failed", 400, errors.array()),
      );
    }
    next();
  },
];
```

---

## Testing

### Unit Tests (Manual Examples)

#### Test Search Functionality

```bash
# Test 1: Search by specialization
curl "http://localhost:3000/api/doctor/search?specialization=Cardiology" | jq '.data | length'

# Test 2: Search by location
curl "http://localhost:3000/api/doctor/search?location=Boston" | jq '.data | length'

# Test 3: Search by condition
curl "http://localhost:3000/api/doctor/search?condition=Hypertension" | jq '.data[0].treatedConditions'

# Test 4: Pagination
curl "http://localhost:3000/api/doctor/search?page=1&limit=2" | jq '.pagination'
```

#### Test Protected Endpoints

```bash
# Get token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@test.com","password":"pass"}' | jq -r '.data.accessToken')

# Test with token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/doctor/me/profile | jq '.data.firstName'
```

#### Test Error Handling

```bash
# Invalid ObjectId
curl "http://localhost:3000/api/doctor/invalid-id" | jq '.error'

# Missing required field (create)
curl -X POST http://localhost:3000/api/doctor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"firstName":"John"}' | jq '.details[0].message'

# Duplicate email
curl -X POST http://localhost:3000/api/doctor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...same email...}' | jq '.error'
```

### Integration Tests

See `.env.test` for test configuration:

```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/doctor_db_test
```

---

## Deployment

### Environment Variables

**Production (.env.production):**

```env
NODE_ENV=production
PORT=4003
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/doctor_db
GW_AUTH_SERVICE_URL=https://auth-service.example.com
CORS_ORIGIN=https://app.example.com,https://admin.example.com
LOG_LEVEL=warn
JWT_ACCESS_SECRET=strong-secret-key
```

### Docker Deployment

**Dockerfile:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src ./src

EXPOSE 4003
CMD ["node", "src/server.js"]
```

**docker-compose.yml:**

```yaml
services:
  doctor-service:
    build: .
    ports:
      - "4003:4003"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/doctor_db
      - GW_AUTH_SERVICE_URL=http://auth-service:4001
    depends_on:
      - mongo

  mongo:
    image: mongo:8
    ports:
      - "27017:27017"
```

### Kubernetes Deployment

See `k8s/doctor-service-deployment.yaml` for full configuration.

---

## Performance Optimization

### Database Query Optimization

**Use Compound Indexes:**

```javascript
// ❌ Bad: Two separate queries
const specialty = await Doctor.find({ specializations: "Cardiology" });
const location = await Doctor.find({ "address.city": "Boston" });

// ✅ Good: Single query with compound index
const doctors = await Doctor.find({
  specializations: "Cardiology",
  "address.city": "Boston",
});
```

**Use Lean Queries:**

```javascript
// ❌ Returns full Mongoose documents (slower)
const doctors = await Doctor.find(query);

// ✅ Returns plain JavaScript objects (faster for read-only)
const doctors = await Doctor.find(query).lean();
```

**Pagination:**

```javascript
const page = parseInt(req.query.page) || 1;
const limit = Math.min(parseInt(req.query.limit) || 10, 100);
const skip = (page - 1) * limit;

const doctors = await Doctor.find(query).skip(skip).limit(limit).lean();
```

### Caching Strategy

**Cache Filter Options:**

```javascript
// Cache for 5 minutes
const specializations = await cache.getOrSet(
  "doctor:specializations",
  () => Doctor.distinct("specializations"),
  300, // TTL in seconds
);
```

### Connection Pooling

MongoDB connection pooling configured in `config/database.js`:

```javascript
mongoose.connect(mongodbUri, {
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
});
```

---

## Security

### Security Headers

Helmet middleware adds security headers:

```javascript
// Automatically includes:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - X-XSS-Protection: 1; mode=block
// - Strict-Transport-Security (HTTPS)
```

### Authentication & Authorization

**JWT Validation:**

```javascript
// Token validation happens in auth middleware
const decoded = await validateToken(token);
// Token expires in 1 hour (configurable)
```

**Role-Based Access Control:**

```javascript
// Middleware checks user.role
requireRole("doctor", "admin"); // Only doctors and admins

// Ownership verification
requireOwnership(); // Users can only modify their own profiles
```

### Input Validation

**Schema Validation:**

```javascript
// All inputs validated with express-validator
// Prevents injection attacks
// Trims and normalizes strings
// Type checks all fields
```

### Data Protection

**Soft Deletes:**

```javascript
// Doctors are not physically deleted
isDeleted: true; // Marked for deletion instead

// Queries automatically exclude soft-deleted docs
doctorSchema.find({ isDeleted: false });
```

**Sensitive Data:**

- Passwords hashed in Auth Service (not stored in Doctor Service)
- License numbers stored (not SSN or medical records)
- PII encrypted at rest (database encryption)

---

## Logging

### Logger Configuration

**Winston Setup:**

```javascript
// src/utils/logger.js
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});
```

**Log Levels:**

```javascript
logger.error("Error message", { context });
logger.warn("Warning message", { context });
logger.info("Info message", { context });
logger.debug("Debug message", { context });
```

**Access Logs:**

```javascript
// Morgan tracks all HTTP requests
app.use(morgan("combined"));
```

---

## Monitoring

### Health Checks

**Liveness Check:**

```bash
GET /health
```

Returns service and database status.

**Readiness Check:**

```bash
GET /health/ready
```

Checks if service can handle requests.

### Metrics

Configure Prometheus metrics export (future enhancement):

```javascript
// /metrics endpoint would expose:
// - Request count
// - Response latency
// - Error rates
// - Database connection pool stats
```

---

## Contributing

### Code Style

- Use ES6+ (const/let, arrow functions)
- Follow Express.js conventions
- Add JSDoc comments for functions
- Keep functions small and focused

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/doctor-search-optimization

# Make changes and test
npm run dev
npm test

# Commit with clear messages
git commit -m "feat: optimize doctor search with compound indexes"

# Push and create PR
git push origin feature/doctor-search-optimization
```

---

## Troubleshooting for Developers

### Service Won't Start

1. Check Node version: `node --version` (should be v20+)
2. Check MongoDB: `nc -zv localhost 27017`
3. Check port 4003: `lsof -i :4003`
4. Check env vars: `cat .env`

### Database Connection Issues

```javascript
// Connection error in database.js
// Check MongoDB URI format
// mongodb://host:port/database
// or for Atlas: mongodb+srv://user:pass@cluster.mongodb.net/database

// Test connection
mongo "mongodb://localhost:27017/doctor_db"
```

### Search Not Working

1. Verify indexes exist: `db.doctors.getIndexes()`
2. Reseed data: `npm run seed`
3. Check specializations in DB: `db.doctors.distinct('specializations')`

---

**Last Updated:** February 5, 2026  
**Doctor Service Version:** 1.0.0  
**Maintainer:** Development Team

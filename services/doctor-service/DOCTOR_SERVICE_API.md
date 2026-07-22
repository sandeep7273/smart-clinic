# Doctor Service API Documentation

## Overview

The Doctor Service is a microservice responsible for managing doctor profiles, specializations, availability, and comprehensive search capabilities. It provides REST API endpoints for finding doctors based on specialty, location, conditions, symptoms, and availability.

**Service URL:** `http://localhost:4003`  
**API Gateway URL:** `http://localhost:3000/api/doctor`  
**Database:** MongoDB (doctor_db)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Public Endpoints](#public-endpoints)
4. [Protected Endpoints](#protected-endpoints)
5. [Request/Response Examples](#requestresponse-examples)
6. [Filter Options](#filter-options)
7. [Search Capabilities](#search-capabilities)
8. [Error Handling](#error-handling)
9. [Integration](#integration)

---

## Quick Start

### Health Check

Verify the doctor service is running:

```bash
curl http://localhost:4003/health
```

Response:

```json
{
  "service": "doctor-service",
  "status": "UP",
  "timestamp": "2026-02-04T17:08:19.043Z",
  "uptime": 12.203009417,
  "database": "connected"
}
```

### Get Filter Options

Get available specializations, locations, and conditions for dropdowns:

```bash
curl http://localhost:3000/api/doctor/filters/options
```

Response:

```json
{
  "success": true,
  "data": {
    "specializations": [
      "Cardiology",
      "Dermatology",
      "Pediatrics",
      "Orthopedics",
      "Neurology",
      ...
    ],
    "locations": [
      "Boston",
      "San Francisco",
      "Austin",
      "Denver",
      "Miami"
    ],
    "conditions": [
      "Heart Disease",
      "Hypertension",
      "Diabetes",
      "Asthma",
      ...
    ]
  }
}
```

---

## Authentication

### Authentication Types

1. **Public Endpoints:** No authentication required (GET requests for search/browse)
2. **Protected Endpoints:** Require JWT Bearer token in Authorization header
   ```
   Authorization: Bearer <your_jwt_token>
   ```

### Getting Authentication Token

Users must authenticate through the Auth Service:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Returns:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "role": "doctor"
    }
  }
}
```

---

## Public Endpoints

### 1. Search Doctors

**Endpoint:** `GET /api/doctor/search`

**Description:** Search doctors with comprehensive filters

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `query` | string | Free text search (name, bio, specialty) | `cardiology`, `heart` |
| `specialization` | string | Filter by specialization | `Cardiology` |
| `location` | string | Filter by city | `Boston` |
| `condition` | string | Filter by treated condition | `Heart Disease` |
| `symptom` | string | Filter by treated symptom | `Chest Pain` |
| `date` | string | Filter by availability date (ISO 8601) | `2026-02-10` |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Results per page (default: 10, max: 100) | `20` |

**Example:**

```bash
# Search by specialty and location
curl "http://localhost:3000/api/doctor/search?specialization=Cardiology&location=Boston"

# Search by free text
curl "http://localhost:3000/api/doctor/search?query=cardiac+pain"

# Search with pagination
curl "http://localhost:3000/api/doctor/search?specialization=Pediatrics&page=2&limit=20"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "69837b2355813aca43cdbc67",
      "userId": "507f1f77bcf86cd799439011",
      "firstName": "Sarah",
      "lastName": "Johnson",
      "email": "dr.sarah.johnson@healthcare.com",
      "phone": "+1-555-0101",
      "specializations": ["Cardiology", "Internal Medicine"],
      "treatedConditions": ["Hypertension", "Heart Disease", "Arrhythmia"],
      "treatedSymptoms": ["Chest Pain", "Shortness of Breath", "Palpitations"],
      "bio": "Board-certified cardiologist with 15 years of experience...",
      "rating": 4.8,
      "reviewCount": 127,
      "consultationFee": 200,
      "address": {
        "street": "123 Medical Center Dr",
        "city": "Boston",
        "state": "MA",
        "zipCode": "02115",
        "country": "USA"
      },
      "qualifications": [
        {
          "degree": "MD",
          "institution": "Harvard Medical School",
          "year": 2008
        }
      ],
      "weeklySchedule": [
        {
          "dayOfWeek": 1,
          "isAvailable": true,
          "startTime": "09:00",
          "endTime": "17:00"
        }
      ],
      "status": "active",
      "isAvailable": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "pages": 1
  }
}
```

---

### 2. Get Available Doctors

**Endpoint:** `GET /api/doctor/available`

**Description:** Get doctors available on a specific date

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | string | Date in ISO 8601 format (required) |
| `specialization` | string | Optional filter by specialization |
| `location` | string | Optional filter by location |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 10) |

**Example:**

```bash
curl "http://localhost:3000/api/doctor/available?date=2026-02-10&specialization=Pediatrics"
```

---

### 3. Get Doctors by Specialization

**Endpoint:** `GET /api/doctor/specialization/:specialization`

**Description:** Get all doctors with a specific specialization

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `specialization` | string | Specialization name (e.g., Cardiology) |

**Example:**

```bash
curl "http://localhost:3000/api/doctor/specialization/Cardiology?page=1&limit=10"
```

---

### 4. Get Doctor by ID

**Endpoint:** `GET /api/doctor/:id`

**Description:** Get detailed information about a specific doctor

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the doctor |

**Example:**

```bash
curl "http://localhost:3000/api/doctor/69837b2355813aca43cdbc67"
```

---

### 5. Get Doctor Statistics

**Endpoint:** `GET /api/doctor/:id/stats`

**Description:** Get statistics about a doctor (rating, reviews, appointments)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the doctor |

**Response:**

```json
{
  "success": true,
  "data": {
    "doctorId": "69837b2355813aca43cdbc67",
    "totalAppointments": 450,
    "completedAppointments": 435,
    "averageRating": 4.8,
    "totalReviews": 127,
    "availableSlots": 25,
    "upcomingAppointments": 12,
    "yearsActive": 15
  }
}
```

---

### 6. Get Filter Options

**Endpoint:** `GET /api/doctor/filters/options`

**Description:** Get available options for filter dropdowns

**Response:**

```json
{
  "success": true,
  "data": {
    "specializations": [
      "Cardiology",
      "Dermatology",
      "Family Medicine",
      ...
    ],
    "locations": [
      "Austin",
      "Boston",
      "Denver",
      ...
    ],
    "conditions": [
      "Acne",
      "Allergies",
      "Asthma",
      ...
    ]
  }
}
```

---

## Protected Endpoints

**All protected endpoints require:**

- JWT authentication via `Authorization: Bearer <token>` header
- Appropriate user role (doctor or admin)

### 1. Create Doctor Profile

**Endpoint:** `POST /api/doctor`

**Authentication:** Required (doctor role)

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "dr.john.smith@healthcare.com",
  "phone": "+1-555-0100",
  "specializations": ["Cardiology", "Internal Medicine"],
  "treatedConditions": ["Hypertension", "Heart Disease"],
  "treatedSymptoms": ["Chest Pain", "Shortness of Breath"],
  "bio": "Experienced cardiologist with 15+ years of practice",
  "address": {
    "street": "456 Medical Plaza",
    "city": "Boston",
    "state": "MA",
    "zipCode": "02115",
    "country": "USA"
  },
  "qualifications": [
    {
      "degree": "MD",
      "institution": "Harvard Medical School",
      "year": 2008
    }
  ],
  "licenses": [
    {
      "licenseNumber": "MA-123456",
      "issuingAuthority": "Massachusetts Medical Board",
      "state": "Massachusetts",
      "expiryDate": "2025-12-31"
    }
  ],
  "consultationFee": 200,
  "acceptsInsurance": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "69837b2355813aca43cdbc67",
    "userId": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Smith",
    "email": "dr.john.smith@healthcare.com",
    ...
  },
  "message": "Doctor profile created successfully"
}
```

**Status Code:** 201 Created

---

### 2. Get My Profile

**Endpoint:** `GET /api/doctor/me/profile`

**Authentication:** Required (doctor role)

**Description:** Get the authenticated doctor's own profile

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "69837b2355813aca43cdbc67",
    "userId": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Smith",
    ...
  }
}
```

---

### 3. Update Doctor Profile

**Endpoint:** `PUT /api/doctor/:id`

**Authentication:** Required (doctor or admin role)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the doctor |

**Request Body:**

```json
{
  "bio": "Updated bio text",
  "consultationFee": 250,
  "specializations": ["Cardiology", "Internal Medicine", "Preventive Medicine"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "69837b2355813aca43cdbc67",
    ...
  },
  "message": "Doctor profile updated successfully"
}
```

---

### 4. Delete Doctor Profile

**Endpoint:** `DELETE /api/doctor/:id`

**Authentication:** Required (doctor or admin role)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the doctor |

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Doctor profile deleted successfully",
    "doctorId": "69837b2355813aca43cdbc67"
  }
}
```

---

### 5. Add Availability Slot

**Endpoint:** `POST /api/doctor/:id/slots`

**Authentication:** Required (doctor or admin role)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the doctor |

**Request Body:**

```json
{
  "date": "2026-02-10T00:00:00Z",
  "startTime": "09:00",
  "endTime": "10:00",
  "status": "available"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "slotId": "slot_id_123",
    "date": "2026-02-10T00:00:00Z",
    "startTime": "09:00",
    "endTime": "10:00",
    "status": "available"
  },
  "message": "Availability slot added successfully"
}
```

---

### 6. Update Slot Status

**Endpoint:** `PATCH /api/doctor/:id/slots/:slotId`

**Authentication:** Required (doctor or admin role)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the doctor |
| `slotId` | string | MongoDB ObjectId of the slot |

**Request Body:**

```json
{
  "status": "booked",
  "appointmentId": "appointment_id_123"
}
```

**Slot Status Options:**

- `available` - Slot is available for booking
- `booked` - Slot is booked with an appointment
- `cancelled` - Slot was cancelled
- `completed` - Appointment completed

**Response:**

```json
{
  "success": true,
  "data": {
    "slotId": "slot_id_123",
    "status": "booked",
    "appointmentId": "appointment_id_123"
  },
  "message": "Slot status updated successfully"
}
```

---

## Request/Response Examples

### Example 1: Search by Specialty and Location

```bash
curl -X GET "http://localhost:3000/api/doctor/search?specialization=Pediatrics&location=Austin" \
  -H "Content-Type: application/json"
```

**Response (Excerpt):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "69837b2355813aca43cdbc69",
      "firstName": "Emily",
      "lastName": "Rodriguez",
      "specializations": ["Pediatrics", "Family Medicine"],
      "address": {
        "city": "Austin",
        "state": "TX"
      },
      "consultationFee": 150,
      "rating": 4.7
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

---

### Example 2: Search by Condition

```bash
curl -X GET "http://localhost:3000/api/doctor/search?condition=Asthma" \
  -H "Content-Type: application/json"
```

---

### Example 3: Create Doctor Profile (Protected)

```bash
curl -X POST "http://localhost:3000/api/doctor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -d '{
    "firstName": "Michael",
    "lastName": "Brown",
    "email": "dr.michael.brown@healthcare.com",
    "phone": "+1-555-0110",
    "specializations": ["Orthopedics"],
    "treatedConditions": ["Fractures", "Arthritis"],
    "treatedSymptoms": ["Joint Pain", "Swelling"],
    "bio": "Orthopedic surgeon with sports medicine expertise",
    "address": {
      "street": "789 Medical Center",
      "city": "Denver",
      "state": "CO",
      "zipCode": "80202",
      "country": "USA"
    },
    "consultationFee": 220
  }'
```

---

## Search Capabilities

The doctor service provides powerful search capabilities through full-text indexing on multiple fields:

### Text-Indexed Fields

- Doctor first name
- Doctor last name
- Specializations
- Treated conditions
- Treated symptoms
- City
- State
- Bio

### Compound Indexes for Performance

1. `(specialization, city, status)` - Optimized for specialty + location searches
2. `(specialization, isAvailable, status)` - Optimized for availability checks
3. `(city, status)` - Optimized for location-based searches
4. `(treatedConditions, status)` - Optimized for condition searches
5. `(treatedSymptoms, status)` - Optimized for symptom searches

### Search Examples

**By Name:**

```bash
curl "http://localhost:3000/api/doctor/search?query=Sarah%20Johnson"
```

**By Condition:**

```bash
curl "http://localhost:3000/api/doctor/search?condition=Hypertension"
```

**By Symptom:**

```bash
curl "http://localhost:3000/api/doctor/search?symptom=Chest%20Pain"
```

**By Multiple Filters:**

```bash
curl "http://localhost:3000/api/doctor/search?specialization=Cardiology&location=Boston&condition=Heart%20Disease"
```

---

## Filter Options

### Getting Specializations

Use the filter options endpoint to populate dropdowns:

```bash
curl "http://localhost:3000/api/doctor/filters/options"
```

**Available Specializations:**

- Cardiology
- Dermatology
- Family Medicine
- Internal Medicine
- Neurology
- Orthopedics
- Pediatrics
- Cosmetic Dermatology
- Pain Management
- Sports Medicine

**Available Locations:**

- Austin
- Boston
- Denver
- Miami
- San Francisco

**Available Conditions:**

- Heart Disease
- Hypertension
- Asthma
- Diabetes
- Arthritis
- Diabetes
- And 15+ more...

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Field-specific error"
    }
  ]
}
```

### Common Error Codes

| Status | Error                 | Description                                     |
| ------ | --------------------- | ----------------------------------------------- |
| 400    | Validation Error      | Invalid request parameters                      |
| 401    | Unauthorized          | Missing or invalid authentication token         |
| 403    | Forbidden             | User role doesn't have permission               |
| 404    | Not Found             | Doctor or resource doesn't exist                |
| 409    | Conflict              | Resource already exists (e.g., duplicate email) |
| 500    | Internal Server Error | Server-side error                               |
| 503    | Service Unavailable   | Database or external service unavailable        |

### Example Error Response

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email already in use"
    }
  ]
}
```

---

## Integration

### API Gateway Integration

The doctor service is integrated with the API Gateway at:

```
API Gateway: http://localhost:3000
Doctor Service: http://localhost:3000/api/doctor
```

All requests to `/api/doctor/*` are automatically proxied to the doctor service running on port 4003.

### Path Rewriting

Request: `GET http://localhost:3000/api/doctor/filters/options`  
Proxied to: `GET http://localhost:4003/api/doctor/filters/options`

### Custom Headers

The API Gateway forwards the following headers to the doctor service:

- `x-correlation-id` - Request tracking ID
- `x-user-id` - Authenticated user ID
- `x-user-email` - Authenticated user email
- `x-user-role` - Authenticated user role
- `x-tenant-id` - Tenant ID (if applicable)

### Service Configuration

**Environment Variables:**

```env
PORT=4003
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/doctor_db
GW_AUTH_SERVICE_URL=http://localhost:4001
CORS_ORIGIN=*
LOG_LEVEL=info
```

### Health Check from API Gateway

```bash
curl http://localhost:3000/health
```

This provides overall system health including doctor service status.

---

## Database Schema

### Doctor Document Structure

```javascript
{
  _id: ObjectId,
  userId: String,                    // Reference to user in auth service
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  specializations: [String],
  treatedConditions: [String],
  treatedSymptoms: [String],
  bio: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number
  }],
  licenses: [{
    licenseNumber: String,
    issuingAuthority: String,
    state: String,
    expiryDate: Date,
    isActive: Boolean
  }],
  weeklySchedule: [{
    dayOfWeek: Number,      // 0-6 (0=Sunday)
    isAvailable: Boolean,
    startTime: String,
    endTime: String,
    breaks: [{
      startTime: String,
      endTime: String
    }]
  }],
  availabilitySlots: [{
    date: Date,
    startTime: String,
    endTime: String,
    status: String,         // available|booked|cancelled|completed
    appointmentId: ObjectId,
    notes: String
  }],
  consultationFee: Number,
  rating: Number,
  reviewCount: Number,
  status: String,           // active|inactive|on_leave|suspended
  isAvailable: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Troubleshooting

### Service Not Responding

1. Check if service is running:

   ```bash
   curl http://localhost:4003/health
   ```

2. Check if MongoDB is connected:

   ```bash
   curl http://localhost:4003/health | grep database
   ```

3. Check service logs (if running with `npm run dev`)

### Invalid Search Results

1. Ensure specializations are spelled correctly (case-sensitive)
2. Use the `/filters/options` endpoint to get valid values
3. Check that doctors have filled in the searched fields

### Authentication Issues

1. Verify JWT token is valid:

   ```bash
   curl -X POST http://localhost:3000/api/auth/verify \
     -H "Authorization: Bearer <token>"
   ```

2. Ensure token is included in Authorization header
3. Check token expiration

---

## API Rate Limiting

The API Gateway applies rate limiting to all requests:

- **General limit:** 100 requests per 15 minutes
- **Auth limit:** 5 requests per 15 minutes
- **Doctor Service:** Uses general rate limit

---

## Swagger Documentation

Full API documentation is available via Swagger UI:

```
http://localhost:4003/api-docs
```

Access the interactive API documentation to test endpoints directly.

---

## Support

For issues or questions:

1. Check the Swagger documentation at `/api-docs`
2. Review error messages and response codes
3. Check service logs for detailed error information
4. Verify all required environment variables are set

---

**Last Updated:** February 5, 2026  
**Version:** 1.0.0  
**Service Name:** doctor-service  
**Database:** MongoDB (doctor_db)

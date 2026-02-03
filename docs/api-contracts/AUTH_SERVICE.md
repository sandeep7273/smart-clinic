# Auth Service API Contract

**Service**: Authentication Service  
**Version**: 1.0.0  
**Base URL**: `http://localhost:4001`  
**Last Updated**: February 3, 2026

---

## Overview

The Authentication Service provides user registration, login, token management, and profile access functionality for the Smart Appointment System.

---

## Authentication

All protected endpoints require a valid JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 1. Health Check

**Endpoint**: `GET /health`  
**Authentication**: None  
**Rate Limit**: General (100 req/15min)

**Description**: Check service health status

**Request**: None

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Auth service is running",
  "timestamp": "2026-02-03T00:00:00.000Z",
  "uptime": 3600.5,
  "environment": "development"
}
```

---

### 2. Register User

**Endpoint**: `POST /auth/register`  
**Authentication**: None  
**Rate Limit**: 3 registrations per hour per IP

**Description**: Register a new user account

**Request Body**:
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars, must include uppercase, lowercase, number)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "phoneNumber": "string (optional)",
  "dateOfBirth": "string (optional, ISO 8601 date)",
  "role": "string (optional, enum: patient|doctor|admin, default: patient)"
}
```

**Example Request**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "role": "patient"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "role": "patient",
      "tenantId": "tenant-001",
      "isEmailVerified": false,
      "createdAt": "2026-02-03T00:00:00.000Z",
      "updatedAt": "2026-02-03T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses**:

400 Bad Request - Validation Error:
```json
{
  "success": false,
  "error": {
    "message": "Validation error",
    "statusCode": 400,
    "details": [
      {
        "path": ["password"],
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

400 Bad Request - Email Already Exists:
```json
{
  "success": false,
  "error": {
    "message": "Email already registered",
    "statusCode": 400
  }
}
```

429 Too Many Requests:
```json
{
  "success": false,
  "error": {
    "message": "Too many registration attempts. Please try again later.",
    "statusCode": 429
  }
}
```

---

### 3. Login

**Endpoint**: `POST /auth/login`  
**Authentication**: None  
**Rate Limit**: 5 attempts per 15 minutes per IP

**Description**: Authenticate user and receive tokens

**Request Body**:
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

**Example Request**:
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "dateOfBirth": "1990-01-01T00:00:00.000Z",
      "role": "patient",
      "tenantId": "tenant-001",
      "isEmailVerified": false,
      "createdAt": "2026-02-03T00:00:00.000Z",
      "updatedAt": "2026-02-03T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses**:

401 Unauthorized - Invalid Credentials:
```json
{
  "success": false,
  "error": {
    "message": "Invalid email or password",
    "statusCode": 401
  }
}
```

403 Forbidden - Account Deactivated:
```json
{
  "success": false,
  "error": {
    "message": "Account is deactivated",
    "statusCode": 403
  }
}
```

429 Too Many Requests:
```json
{
  "success": false,
  "error": {
    "message": "Too many login attempts. Please try again later.",
    "statusCode": 429
  }
}
```

---

### 4. Refresh Token

**Endpoint**: `POST /auth/refresh`  
**Authentication**: None  
**Rate Limit**: General (100 req/15min)

**Description**: Get a new access token using a valid refresh token

**Request Body**:
```json
{
  "refreshToken": "string (required)"
}
```

**Example Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses**:

401 Unauthorized - Invalid Token:
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired refresh token",
    "statusCode": 401
  }
}
```

404 Not Found - User Not Found:
```json
{
  "success": false,
  "error": {
    "message": "User not found",
    "statusCode": 404
  }
}
```

---

### 5. Logout

**Endpoint**: `POST /auth/logout`  
**Authentication**: None  
**Rate Limit**: General (100 req/15min)

**Description**: Invalidate a refresh token (logout from one device)

**Request Body**:
```json
{
  "refreshToken": "string (required)"
}
```

**Example Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Notes**:
- Logout will always return success, even if the token is invalid or expired
- This ensures a consistent user experience

---

### 6. Get Current User Profile

**Endpoint**: `GET /auth/me`  
**Authentication**: Required (Bearer token)  
**Rate Limit**: General (100 req/15min)

**Description**: Get the profile of the currently authenticated user

**Request Headers**:
```
Authorization: Bearer <access_token>
```

**Request**: None

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "role": "patient",
    "tenantId": "tenant-001",
    "isActive": true,
    "isEmailVerified": false,
    "createdAt": "2026-02-03T00:00:00.000Z",
    "updatedAt": "2026-02-03T00:00:00.000Z"
  }
}
```

**Error Responses**:

401 Unauthorized - Missing Token:
```json
{
  "success": false,
  "error": {
    "message": "No token provided",
    "statusCode": 401
  }
}
```

401 Unauthorized - Invalid Token:
```json
{
  "success": false,
  "error": {
    "message": "Invalid or expired token",
    "statusCode": 401
  }
}
```

404 Not Found - User Not Found:
```json
{
  "success": false,
  "error": {
    "message": "User not found",
    "statusCode": 404
  }
}
```

---

## Data Models

### User Object

```typescript
{
  id: string;                    // UUID
  email: string;                 // Unique, validated email
  firstName: string;
  lastName: string;
  fullName?: string;             // Virtual field (firstName + lastName)
  phoneNumber?: string;
  dateOfBirth?: string;          // ISO 8601 date
  profilePicture?: string;       // URL
  role: 'patient' | 'doctor' | 'admin';
  tenantId: string;              // Multi-tenant support
  isActive: boolean;             // Account status
  isEmailVerified: boolean;      // Email verification status
  lastLogin?: string;            // ISO 8601 datetime
  createdAt: string;             // ISO 8601 datetime
  updatedAt: string;             // ISO 8601 datetime
}
```

**Note**: Password field is never returned in API responses

---

## Authentication Flow

### Registration Flow
```
1. Client sends registration data to POST /auth/register
2. Server validates input (email format, password strength, required fields)
3. Server checks if email already exists
4. Server hashes password with bcrypt
5. Server creates user in database
6. Server generates access token (15 min expiry) and refresh token (7 day expiry)
7. Server stores refresh token with user
8. Server returns user profile and tokens
9. Client stores tokens securely (Keychain/AsyncStorage)
```

### Login Flow
```
1. Client sends credentials to POST /auth/login
2. Server validates input
3. Server finds user by email
4. Server verifies password with bcrypt
5. Server checks if account is active
6. Server generates new access and refresh tokens
7. Server updates lastLogin timestamp
8. Server stores new refresh token
9. Server returns user profile and tokens
10. Client stores tokens securely
```

### Token Refresh Flow
```
1. Client detects access token is expired (or about to expire)
2. Client sends refresh token to POST /auth/refresh
3. Server verifies refresh token
4. Server checks if refresh token exists in user's token list
5. Server generates new access token and refresh token
6. Server replaces old refresh token with new one
7. Server returns new tokens
8. Client updates stored tokens
```

### Logout Flow
```
1. Client sends refresh token to POST /auth/logout
2. Server verifies refresh token (optional)
3. Server removes refresh token from user's token list
4. Server returns success
5. Client deletes stored tokens
```

### Protected Endpoint Access
```
1. Client includes access token in Authorization header
2. Server extracts and verifies access token
3. Server decodes token to get user info
4. Server attaches user info to request
5. Server processes request with user context
6. Server returns response
```

---

## Token Details

### Access Token
- **Type**: JWT
- **Expiry**: 15 minutes
- **Purpose**: Short-lived token for API access
- **Storage**: Memory or secure storage
- **Payload**:
  ```json
  {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "patient",
    "tenantId": "tenant-001",
    "iat": 1234567890,
    "exp": 1234568790,
    "iss": "auth-service"
  }
  ```

### Refresh Token
- **Type**: JWT
- **Expiry**: 7 days
- **Purpose**: Long-lived token for obtaining new access tokens
- **Storage**: Secure storage only (Keychain/SecureStore)
- **Payload**:
  ```json
  {
    "userId": "uuid",
    "iat": 1234567890,
    "exp": 1235172690,
    "iss": "auth-service"
  }
  ```

**Note**: Each user can have up to 5 active refresh tokens (supports 5 devices/sessions)

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| All endpoints (general) | 100 requests | 15 minutes |
| POST /auth/login | 5 attempts | 15 minutes |
| POST /auth/register | 3 accounts | 1 hour |
| Other auth endpoints | General limit | 15 minutes |

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## Error Response Format

All errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "statusCode": 400,
    "details": []  // Optional: validation errors or additional context
  }
}
```

### Common Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Invalid input, validation error |
| 401 | Unauthorized | Invalid or missing token |
| 403 | Forbidden | Account deactivated, insufficient permissions |
| 404 | Not Found | User not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Security Considerations

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- Special characters recommended but optional

### Token Security
- Access tokens should be stored in memory when possible
- Refresh tokens must be stored in secure storage (Keychain, SecureStore)
- Never log tokens in production
- Tokens are signed with HS256 algorithm
- Tokens include issuer claim for verification

### Rate Limiting
- Implemented to prevent brute force attacks
- Stricter limits on authentication endpoints
- IP-based limiting

### Additional Security
- CORS enabled with configurable origins
- Helmet security headers
- Input validation on all endpoints
- Password hashing with bcrypt (12 salt rounds)
- SQL/NoSQL injection prevention
- XSS protection

---

## Versioning

**Current Version**: 1.0.0

Future versions will be indicated in the URL:
- v1: `/api/v1/auth/...`
- v2: `/api/v2/auth/...`

---

## Support

For issues or questions about the Auth Service API, contact the development team.

---

**Last Updated**: February 3, 2026

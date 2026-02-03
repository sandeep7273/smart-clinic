# Auth Service

Authentication and authorization microservice for the Smart Appointment System.

## Features

- 🔐 User registration and login
- 🎫 JWT-based authentication (access + refresh tokens)
- 🔄 Token refresh mechanism
- 👤 User profile management
- 🛡️ Role-based access control (RBAC)
- 🔒 Secure password hashing with bcrypt
- 🚦 Rate limiting on sensitive endpoints
- ✅ Input validation with Zod
- 📝 Comprehensive logging with Winston
- 🐳 Docker support
- 🏥 Health check endpoints

## Tech Stack

- **Runtime**: Node.js (LTS)
- **Framework**: Express.js 4.x
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Security**: Helmet, CORS, bcrypt, express-rate-limit
- **Logging**: Winston
- **Language**: JavaScript (ES2020+, CommonJS)

## Prerequisites

- Node.js 18+ or 20+
- MongoDB 6.0+
- npm or yarn

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   - Generate secure JWT secrets (use `openssl rand -base64 32`)
   - Set MongoDB connection URI
   - Configure CORS origins
   - Adjust rate limits if needed

3. **Start MongoDB** (if running locally):
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:6.0
   
   # Or using existing MongoDB installation
   mongod
   ```

## Running the Service

### Development Mode
```bash
npm run dev
```
Server runs on `http://localhost:4001` with auto-reload on file changes.

### Production Mode
```bash
npm start
```

### Using Docker
```bash
# Build image
docker build -t auth-service .

# Run container
docker run -p 4001:4001 --env-file .env auth-service
```

## API Endpoints

### Public Endpoints

#### Health Check
```http
GET /health
```
Returns service health status.

#### Register User
```http
POST /auth/register
Content-Type: application/json

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

**Response** (201):
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
      "role": "patient"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john.doe@example.com",
      "firstName": "John",
      "role": "patient"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

#### Logout
```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Protected Endpoints

#### Get Current User Profile
```http
GET /auth/me
Authorization: Bearer <accessToken>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "role": "patient",
    "isActive": true,
    "isEmailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production/test) | development | No |
| `PORT` | Server port | 4001 | No |
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `JWT_ACCESS_SECRET` | Secret for access tokens | - | Yes |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | - | Yes |
| `JWT_ISSUER` | Token issuer name | auth-service | No |
| `ACCESS_TOKEN_EXPIRY` | Access token expiration | 15m | No |
| `REFRESH_TOKEN_EXPIRY` | Refresh token expiration | 7d | No |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | * | No |
| `CORS_CREDENTIALS` | Allow credentials in CORS | true | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | 900000 | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 | No |

## Security Features

### Password Security
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Bcrypt hashing with 12 salt rounds

### Rate Limiting
- **General**: 100 requests per 15 minutes
- **Auth endpoints** (login): 5 attempts per 15 minutes
- **Registration**: 3 registrations per hour per IP

### Token Management
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Maximum 5 active refresh tokens per user
- Automatic cleanup of expired tokens

### Additional Security
- Helmet.js for HTTP headers
- CORS protection
- Input validation with Zod
- SQL/NoSQL injection prevention
- XSS protection

## Project Structure

```
services/auth-service/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   │   └── auth.controller.js    # Request handlers
│   │   └── routes/
│   │       └── auth.routes.js        # Route definitions
│   ├── config/
│   │   ├── database.js               # MongoDB connection
│   │   └── env.js                    # Environment config
│   ├── middlewares/
│   │   ├── auth.middleware.js        # JWT authentication
│   │   ├── error.middleware.js       # Error handling
│   │   └── rateLimit.middleware.js   # Rate limiting
│   ├── models/
│   │   └── user.js                   # User schema
│   ├── services/
│   │   └── auth.service.js           # Business logic
│   ├── utils/
│   │   ├── jwt.util.js               # JWT utilities
│   │   ├── logger.util.js            # Winston logger
│   │   └── password.util.js          # Password utilities
│   ├── validators/
│   │   └── auth.validator.js         # Zod schemas
│   ├── app.js                        # Express app setup
│   └── server.js                     # Server entry point
├── logs/                             # Log files
├── .env                              # Environment variables
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore rules
├── .dockerignore                     # Docker ignore rules
├── Dockerfile                        # Docker configuration
├── package.json                      # Dependencies
└── README.md                         # Documentation
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "code": "ERROR_CODE"
  }
}
```

### Common Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Testing

```bash
# Run tests (placeholder)
npm test

# Run tests with coverage
npm run test:coverage
```

## Logging

Logs are written to:
- **Console**: All levels in development
- **combined.log**: All logs (max 5MB, rotated)
- **error.log**: Error logs only

Log format:
- **Development**: Colorized console output
- **Production**: JSON format for log aggregation

## Health Monitoring

Health check endpoint returns:
```json
{
  "success": true,
  "message": "Auth service is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

## Development

### Code Style
- Use CommonJS modules (`require`/`module.exports`)
- Use ES2020+ JavaScript features
- Follow consistent naming conventions
- Add JSDoc comments for functions

### Best Practices
- Always use async/await for asynchronous operations
- Wrap async route handlers with `asyncHandler`
- Validate all inputs with Zod
- Log important events and errors
- Handle errors gracefully

## Deployment

### Docker Deployment
```bash
docker build -t auth-service .
docker run -d -p 4001:4001 --env-file .env auth-service
```

### Kubernetes Deployment
```bash
kubectl apply -f k8s/
```

### Helm Deployment
```bash
helm install auth-service ./helm-chart
```

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass
5. Follow commit message conventions

## License

Proprietary - Smart Appointment System

## Support

For issues and questions, please contact the development team.

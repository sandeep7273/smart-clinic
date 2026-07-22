# Doctor Service

Comprehensive doctor management service with advanced search and filtering capabilities.

## Features

- 🔍 **Comprehensive Search**: Search by name, specialty, location, symptoms, and conditions
- 🏥 **Doctor Profiles**: Complete doctor information including qualifications, experience, and ratings
- 📅 **Availability Management**: Manage doctor schedules and appointment slots
- 🔐 **Authentication & Authorization**: JWT-based auth with role-based access control
- 📊 **Statistics & Ratings**: Track doctor performance and patient reviews
- 🎯 **Filter Options**: Dynamic dropdowns for specializations, locations, and conditions

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT via Auth Service
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB (v5+)
- Auth Service running on port 4001

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Seed sample data
npm run seed

# Start development server
npm run dev
```

### Environment Variables

```env
NODE_ENV=development
PORT=4003
MONGODB_URI=mongodb://localhost:27017/doctor_db
GW_AUTH_SERVICE_URL=http://localhost:4001
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

## API Endpoints

### Public Endpoints

- `GET /health` - Health check
- `GET /api/doctors/search` - Search doctors
- `GET /api/doctors/available` - Get available doctors
- `GET /api/doctors/filters/options` - Get filter options
- `GET /api/doctors/:id` - Get doctor by ID
- `GET /api/doctors/specialization/:specialization` - Get by specialty

### Protected Endpoints (Require Authentication)

- `POST /api/doctors` - Create doctor profile (Doctor role)
- `PUT /api/doctors/:id` - Update doctor profile (Doctor/Admin)
- `DELETE /api/doctors/:id` - Delete doctor profile (Doctor/Admin)
- `POST /api/doctors/:id/slots` - Add availability slot (Doctor/Admin)
- `PATCH /api/doctors/:id/slots/:slotId` - Update slot status (Doctor/Admin)

## Search Examples

### Search by query

```bash
curl "http://localhost:4003/api/doctors/search?query=cardiology"
```

### Filter by specialty and location

```bash
curl "http://localhost:4003/api/doctors/search?specialization=Cardiology&location=Boston"
```

### Search by symptoms

```bash
curl "http://localhost:4003/api/doctors/search?symptom=chest%20pain"
```

### Get filter options for dropdowns

```bash
curl "http://localhost:4003/api/doctors/filters/options"
```

## Database Schema

The Doctor model includes:

- Personal information (name, email, phone)
- Professional details (specializations, experience, qualifications)
- Address and contact information
- Weekly schedule and availability slots
- Ratings and reviews
- Treated conditions and symptoms (for search)

### Text Search Indexes

The service uses MongoDB text indexes on:

- firstName, lastName
- specializations
- treatedConditions, treatedSymptoms
- address.city, address.state
- bio

### Compound Indexes for Performance

- (specializations, address.city, status)
- (specializations, isAvailable, status)
- (address.city, status)
- (treatedConditions, status)
- (treatedSymptoms, status)

## API Documentation

Once running, visit:

- Swagger UI: http://localhost:4003/api-docs

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Deployment

The service includes:

- Kubernetes manifests in `k8s/`
- Helm chart in `helm-chart/`
- Health check endpoints for readiness/liveness probes

## Architecture

- **Service Layer**: Business logic and data validation
- **Controller Layer**: HTTP request/response handling
- **Middleware Layer**: Authentication, authorization, validation
- **Model Layer**: MongoDB schemas with Mongoose

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

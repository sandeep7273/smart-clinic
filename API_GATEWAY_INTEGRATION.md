# API Gateway Integration - GraphQL & Kafka

## Overview

All services and mobile_ui_app now communicate **exclusively through the API Gateway**. No direct service-to-service calls are made.

### Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │ GraphQL + REST
         ▼
┌─────────────────────────────────┐
│      API Gateway (Port 3000)    │
│  ┌───────────────────────────┐  │
│  │  GraphQL Federation       │  │
│  │  - Schema Stitching       │  │
│  │  - Authentication         │  │
│  │  - Rate Limiting          │  │
│  └───────────────────────────┘  │
└────────┬───────────┬────────────┘
         │           │
         │ GraphQL   │ Kafka Events
         ▼           ▼
┌────────────────┐  ┌────────────────┐
│ Doctor Service │  │ Other Services │
│  (Port 4003)   │  │                │
│  - GraphQL API │  │  - Auth        │
│  - Kafka Events│  │  - Appointment │
└────────────────┘  └────────────────┘
```

---

## API Gateway Setup

### GraphQL Federation

The API Gateway uses **schema stitching** to combine GraphQL schemas from multiple microservices into a single unified endpoint.

**Location:** `/api-gateway/src/graphql/`

**Key Files:**
- `simpleFederation.js` - Orchestrates schema stitching
- `doctorServiceProxy.js` - Proxies GraphQL to doctor-service
- `context.js` - Creates GraphQL context with auth

### Features

✅ **Single GraphQL Endpoint**: `http://localhost:3000/graphql`
✅ **Authentication**: JWT token validation and forwarding
✅ **Rate Limiting**: Protects against abuse
✅ **Error Handling**: Unified error responses
✅ **Logging**: Correlation IDs for request tracking
✅ **Schema Introspection**: GraphQL Playground enabled in development

---

## Mobile App Integration

### GraphQL Client

**Location:** `/mobile_ui_app/src/api/graphql.client.ts`

**Configuration:** `/mobile_ui_app/src/constants/config.ts`

```typescript
// GraphQL endpoint routes through API Gateway
API_CONFIG.GRAPHQL_URL = 'http://localhost:3000/graphql'  // iOS Simulator
                      = 'http://10.0.2.2:3000/graphql'    // Android Emulator
```

### Usage Example

```typescript
import { searchDoctors, getDoctorById } from '../api/graphql.client';

// Search doctors (goes through API Gateway)
const doctors = await searchDoctors({
  specialization: 'Cardiology',
  city: 'New York',
  page: 1,
  limit: 10
});

// Get doctor details
const doctor = await getDoctorById('507f1f77bcf86cd799439011');
```

### Available GraphQL Operations

#### Queries
- `searchDoctors` - Search with filters, pagination, sorting
- `getDoctorById` - Get single doctor details
- `getDoctorAvailability` - Get time slots
- `getDoctorsBySpecialization` - Filter by specialty
- `getPopularSpecializations` - Get trending specializations

#### Mutations
- `reserveSlot` - Reserve time slot for appointment
- `releaseSlot` - Release reserved slot
- `createDoctor` - Create new doctor profile (admin/doctor only)
- `updateDoctor` - Update doctor profile
- `updateDoctorAvailability` - Update schedule

---

## Kafka Event Streaming

### Event Flow

```
Doctor Service → Kafka Topics → Other Services
```

### Published Events

Doctor Service publishes to `doctor-events` topic:

```javascript
DOCTOR_CREATED              // New doctor profile created
DOCTOR_UPDATED              // Profile updated
DOCTOR_DELETED              // Profile deleted (soft delete)
DOCTOR_SLOT_RESERVED        // Time slot booked
DOCTOR_SLOT_RELEASED        // Time slot freed
DOCTOR_AVAILABILITY_UPDATED // Schedule changed
```

### Event Structure

```json
{
  "eventType": "DOCTOR_SLOT_RESERVED",
  "payload": {
    "doctorId": "507f1f77bcf86cd799439011",
    "slotId": "slot123",
    "date": "2026-02-15T00:00:00.000Z",
    "startTime": "10:00",
    "endTime": "10:30",
    "userId": "user456",
    "status": "booked"
  },
  "metadata": {
    "timestamp": "2026-02-10T12:00:00.000Z",
    "service": "doctor-service",
    "version": "1.0.0",
    "correlationId": "doctor-1707566400000-abc123"
  }
}
```

### Consumed Events

Doctor Service listens to:

**From `user-events` topic:**
- `USER_REGISTERED` - Auto-create doctor profile if role is "doctor"
- `USER_PROFILE_UPDATED` - Sync user data changes

**From `appointment-events` topic:**
- `APPOINTMENT_BOOKED` - Reserve time slot
- `APPOINTMENT_CANCELLED` - Release time slot
- `APPOINTMENT_COMPLETED` - Update doctor metrics

---

## Configuration

### API Gateway

**File:** `/api-gateway/src/config/index.js`

```javascript
module.exports = {
  app: {
    port: 3000,
    env: 'development'
  },
  services: {
    doctor: 'http://localhost:4003',
    auth: 'http://localhost:4001',
    appointment: 'http://localhost:4004'
  },
  kafka: {
    brokers: ['localhost:9092']
  }
};
```

### Doctor Service

**File:** `/services/doctor-service/src/config/index.js`

```javascript
module.exports = {
  port: 4003,
  kafka: {
    brokers: [process.env.KAFKA_BROKER_URL || 'localhost:9092'],
    topics: {
      doctorEvents: 'doctor-events',
      userEvents: 'user-events',
      appointmentEvents: 'appointment-events'
    }
  }
};
```

### Mobile App

**File:** `/mobile_ui_app/src/constants/config.ts`

```typescript
export const APP_CONFIG = {
  IOS_SIMULATOR_GRAPHQL_URL: 'http://localhost:3000/graphql',
  ANDROID_EMULATOR_GRAPHQL_URL: 'http://10.0.2.2:3000/graphql',
  PHYSICAL_DEVICE_GRAPHQL_URL: 'http://192.168.1.100:3000/graphql',
};
```

---

## Testing

### 1. Test GraphQL through API Gateway

```bash
# Start services
cd api-gateway && npm run dev
cd services/doctor-service && npm run dev

# Test GraphQL endpoint
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

### 2. Test GraphQL Playground

Open in browser:
```
http://localhost:3000/graphql
```

Query example:
```graphql
query SearchDoctors {
  searchDoctors(
    search: "cardio"
    filters: { city: "New York", minRating: 4.0 }
    page: 1
    limit: 10
  ) {
    doctors {
      id
      firstName
      lastName
      specializations
      rating
      consultationFee
    }
    pagination {
      total
      hasNext
    }
  }
}
```

### 3. Test Kafka Events

```bash
# Terminal 1: Start Kafka consumer
kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic doctor-events \
  --from-beginning

# Terminal 2: Trigger an event (e.g., create doctor)
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "mutation { createDoctor(input: {...}) { id } }"
  }'

# Terminal 1: See the event published
```

### 4. Test Mobile App

```bash
# Start Metro bundler
cd mobile_ui_app
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Test doctor search (uses GraphQL through API Gateway)
# Navigate to Doctor List screen and search
```

---

## Benefits

### For Mobile App
- ✅ Single entry point (API Gateway)
- ✅ Simplified configuration
- ✅ Centralized authentication
- ✅ Better security (no direct service access)
- ✅ Flexible data fetching with GraphQL
- ✅ Reduced network calls

### For Microservices
- ✅ Event-driven architecture
- ✅ Loose coupling via Kafka
- ✅ Asynchronous communication
- ✅ Scalability
- ✅ Fault tolerance

### For Development
- ✅ GraphQL Playground for testing
- ✅ Self-documenting API
- ✅ Type safety
- ✅ Event audit trail
- ✅ Easier debugging with correlation IDs

---

## Migration from Direct Service Calls

### Before (Direct Calls)
```typescript
// ❌ Old way - direct doctor service call
const response = await axios.get(
  'http://localhost:4003/api/doctors/search',
  { params: { city: 'New York' } }
);
```

### After (Through API Gateway)
```typescript
// ✅ New way - GraphQL through API Gateway
import { searchDoctors } from '../api/graphql.client';

const result = await searchDoctors({
  city: 'New York',
  page: 1,
  limit: 10
});
```

---

## Troubleshooting

### GraphQL endpoint not available
```bash
# Check API Gateway logs
cd api-gateway && npm run dev

# Check if doctor-service GraphQL is running
curl http://localhost:4003/graphql
```

### Kafka events not publishing
```bash
# Check Kafka is running
docker ps | grep kafka

# Check doctor-service Kafka connection
# Look for "Kafka producer connected" in logs
```

### Mobile app can't connect
```bash
# iOS Simulator - use localhost:3000
# Android Emulator - use 10.0.2.2:3000
# Physical Device - use your computer's IP

# Update config.ts with correct IP
export const PHYSICAL_DEVICE_GRAPHQL_URL = 'http://YOUR_IP:3000/graphql';
```

---

## Next Steps

1. ✅ **Implement Authentication** - Add JWT validation in API Gateway
2. ✅ **Add More Services** - Integrate appointment-service GraphQL
3. ⬜ **Add Subscriptions** - Real-time updates via GraphQL subscriptions
4. ⬜ **Add Caching** - Redis cache for frequently accessed data
5. ⬜ **Add Monitoring** - Prometheus metrics, Grafana dashboards
6. ⬜ **Add API Versioning** - Support multiple API versions

---

## Resources

- **API Gateway**: http://localhost:3000
- **GraphQL Playground**: http://localhost:3000/graphql
- **Doctor Service**: http://localhost:4003
- **Kafka UI**: http://localhost:9021 (if using Confluent)
- **Mobile App**: React Native Metro bundler

---

## Summary

✅ **All communication flows through API Gateway**
✅ **GraphQL provides flexible querying**
✅ **Kafka enables event-driven architecture**
✅ **Mobile app has single entry point**
✅ **Services are loosely coupled**
✅ **System is scalable and maintainable**

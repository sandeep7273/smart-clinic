# Doctor Service - GraphQL & Kafka Integration Guide

## Overview

The Doctor Service now has **full Kafka and GraphQL integration** for enhanced functionality:

### ✅ **Kafka Events** - Real-time Event Streaming
- Publishes events for all doctor operations (create, update, delete, slot changes)
- Consumes events from appointment-service and auth-service
- Enables event-driven architecture

### ✅ **GraphQL API** - Flexible Queries
- Apollo Server running at `/graphql`
- Type-safe queries and mutations
- GraphQL Playground for testing
- Supports complex filtering and pagination

---

## Kafka Integration

### Published Events

The doctor-service publishes the following events:

```javascript
// Doctor lifecycle events
DOCTOR_CREATED          - When a new doctor profile is created
DOCTOR_UPDATED          - When doctor profile is updated
DOCTOR_DELETED          - When doctor profile is deleted
DOCTOR_STATUS_CHANGED   - When doctor status changes (active/inactive/on_leave)

// Slot management events
DOCTOR_SLOT_RESERVED    - When a time slot is booked
DOCTOR_SLOT_RELEASED    - When a time slot is freed up
DOCTOR_AVAILABILITY_UPDATED - When availability schedule changes

// Profile events
DOCTOR_PROFILE_VERIFIED - When doctor is verified by admin
DOCTOR_SERVICES_UPDATED - When medical services are updated
```

### Event Structure

```javascript
{
  eventType: "DOCTOR_CREATED",
  payload: {
    doctorId: "507f1f77bcf86cd799439011",
    userId: "user123",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    specializations: ["Cardiology"],
    consultationFee: 500,
    status: "active"
  },
  metadata: {
    timestamp: "2026-02-10T12:00:00.000Z",
    service: "doctor-service",
    version: "1.0.0",
    correlationId: "doctor-1707566400000-abc123"
  }
}
```

### Consumed Events

The doctor-service listens to these events from other services:

```javascript
// From auth-service
USER_REGISTERED         - Creates doctor profile if role is "doctor"
USER_PROFILE_UPDATED    - Updates doctor info when user profile changes

// From appointment-service
APPOINTMENT_BOOKED      - Reserves time slot
APPOINTMENT_CANCELLED   - Releases time slot
APPOINTMENT_COMPLETED   - Updates doctor metrics (ratings, reviews)
```

### Usage in Code

```javascript
const { publishDoctorEvent, EVENT_TYPES } = require('../kafka');

// Publish an event
await publishDoctorEvent(EVENT_TYPES.DOCTOR_CREATED, {
  doctorId: doctor._id.toString(),
  userId: userId,
  firstName: doctor.firstName,
  lastName: doctor.lastName,
  email: doctor.email
});
```

---

## GraphQL Integration

### Endpoint

```
http://localhost:4003/graphql
```

### GraphQL Playground

Open in browser for interactive testing:
```
http://localhost:4003/graphql
```

### Sample Queries

#### 1. Search Doctors with Filters

```graphql
query SearchDoctors {
  searchDoctors(
    search: "cardio"
    filters: {
      specialization: "Cardiology"
      city: "New York"
      minRating: 4.0
      maxFee: 1000
      isAvailable: true
    }
    page: 1
    limit: 10
    sortBy: "rating"
    sortOrder: "desc"
  ) {
    doctors {
      id
      firstName
      lastName
      specializations
      rating
      consultationFee
      address {
        city
        state
      }
      isAvailable
    }
    pagination {
      page
      total
      totalPages
      hasNext
    }
  }
}
```

#### 2. Get Doctor Details

```graphql
query GetDoctor {
  getDoctor(id: "507f1f77bcf86cd799439011") {
    id
    firstName
    lastName
    email
    phone
    specializations
    qualifications {
      degree
      institution
      year
    }
    experience
    rating
    reviewsCount
    consultationFee
    languages
    bio
    services {
      name
      description
      duration
      fee
    }
    isVerified
  }
}
```

#### 3. Get Doctor Availability

```graphql
query GetAvailability {
  getDoctorAvailability(
    doctorId: "507f1f77bcf86cd799439011"
    startDate: "2026-02-10"
    endDate: "2026-02-17"
  ) {
    date
    startTime
    endTime
    status
    appointmentId
  }
}
```

#### 4. Get Doctors by Specialization

```graphql
query GetCardiology {
  getDoctorsBySpecialization(
    specialization: "Cardiology"
    page: 1
    limit: 5
  ) {
    doctors {
      id
      firstName
      lastName
      rating
      consultationFee
      address {
        city
      }
    }
    pagination {
      total
      hasNext
    }
  }
}
```

#### 5. Get Popular Specializations

```graphql
query PopularSpecializations {
  getPopularSpecializations(limit: 10) {
    specialization
    count
    avgRating
    avgFee
  }
}
```

### Sample Mutations

#### 1. Reserve Time Slot

```graphql
mutation ReserveSlot {
  reserveSlot(input: {
    doctorId: "507f1f77bcf86cd799439011"
    date: "2026-02-15"
    startTime: "10:00"
    endTime: "10:30"
    userId: "user123"
    appointmentId: "appt456"
  }) {
    date
    startTime
    endTime
    status
    appointmentId
  }
}
```

#### 2. Release Slot

```graphql
mutation ReleaseSlot {
  releaseSlot(
    doctorId: "507f1f77bcf86cd799439011"
    date: "2026-02-15"
    startTime: "10:00"
  ) {
    date
    startTime
    status
  }
}
```

#### 3. Update Doctor Profile

```graphql
mutation UpdateDoctor {
  updateDoctor(
    id: "507f1f77bcf86cd799439011"
    input: {
      bio: "Experienced cardiologist with 15 years of practice"
      consultationFee: 600
      languages: ["English", "Spanish"]
    }
  ) {
    id
    bio
    consultationFee
    languages
    updatedAt
  }
}
```

---

## Mobile App Integration

### Using GraphQL Client

The mobile app now has a GraphQL client at `src/api/graphql.client.ts`:

```typescript
import { searchDoctors, getDoctorById, getDoctorAvailability } from '../api/graphql.client';

// Search doctors
const result = await searchDoctors({
  search: 'cardio',
  city: 'New York',
  minRating: 4.0,
  page: 1,
  limit: 10
});

// Get doctor details
const doctor = await getDoctorById('507f1f77bcf86cd799439011');

// Get availability
const slots = await getDoctorAvailability(
  '507f1f77bcf86cd799439011',
  '2026-02-10',
  '2026-02-17'
);
```

### Benefits Over REST

1. **Flexible Queries** - Request only the fields you need
2. **Single Endpoint** - No need for multiple REST calls
3. **Type Safety** - Strong typing with TypeScript
4. **Reduced Over-fetching** - Get exactly what you need
5. **Better Developer Experience** - GraphQL Playground for testing

---

## Appointment Service Integration

The appointment-service can use GraphQL for doctor operations:

```javascript
const axios = require('axios');

const graphqlQuery = async (query, variables) => {
  const response = await axios.post('http://doctor-service:4003/graphql', {
    query,
    variables
  }, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.data;
};

// Reserve slot during appointment booking
const reserveSlotMutation = `
  mutation ReserveSlot($input: SlotReservationInput!) {
    reserveSlot(input: $input) {
      date
      startTime
      endTime
      status
    }
  }
`;

const result = await graphqlQuery(reserveSlotMutation, {
  input: {
    doctorId: appointmentData.doctorId,
    date: appointmentData.date,
    startTime: appointmentData.startTime,
    endTime: appointmentData.endTime,
    userId: appointmentData.userId,
    appointmentId: appointment._id
  }
});
```

---

## Event Flow Examples

### Scenario 1: Appointment Booking

```
1. User books appointment (mobile app → appointment-service)
2. Appointment-service publishes APPOINTMENT_BOOKED event
3. Doctor-service consumes event → reserves slot
4. Doctor-service publishes DOCTOR_SLOT_RESERVED event
5. Other services can react (notifications, analytics, etc.)
```

### Scenario 2: Doctor Registration

```
1. User registers with role="doctor" (mobile app → auth-service)
2. Auth-service publishes USER_REGISTERED event
3. Doctor-service consumes event → creates doctor profile
4. Doctor-service publishes DOCTOR_CREATED event
5. Search service indexes new doctor
```

### Scenario 3: Appointment Cancellation

```
1. User cancels appointment (mobile app → appointment-service)
2. Appointment-service publishes APPOINTMENT_CANCELLED event
3. Doctor-service consumes event → releases slot
4. Doctor-service publishes DOCTOR_SLOT_RELEASED event
5. Notification service sends cancellation confirmation
```

---

## Configuration

### Environment Variables

```env
# Kafka Configuration
KAFKA_BROKER_URL=localhost:9092

# GraphQL Configuration
GRAPHQL_INTROSPECTION=true
GRAPHQL_PLAYGROUND=true

# Service Configuration
NODE_ENV=development
PORT=4003
```

### Kafka Topics

```
doctor-events         - Doctor service publishes here
user-events          - Subscribed for user events
appointment-events   - Subscribed for appointment events
```

---

## Testing

### Testing Kafka Events

```bash
# Start Kafka consumer to see events
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic doctor-events --from-beginning
```

### Testing GraphQL

1. Open GraphQL Playground: `http://localhost:4003/graphql`
2. Run queries interactively
3. See schema documentation in the right panel
4. Use autocomplete for type-safe queries

---

## Benefits

### For Mobile App
- Flexible data fetching with GraphQL
- Reduced network calls
- Real-time updates possible with subscriptions
- Better performance

### For Microservices
- Loose coupling via Kafka events
- Asynchronous communication
- Event sourcing capability
- Easy to add new services

### For Development
- GraphQL Playground for testing
- Strong typing
- Self-documenting API
- Event audit trail

---

## Next Steps

1. **Implement GraphQL Subscriptions** - Real-time slot updates
2. **Add More Event Handlers** - Handle review submissions, rating updates
3. **Event Replay** - Rebuild read models from event stream
4. **Monitoring** - Add Kafka metrics and GraphQL query analytics
5. **Caching** - Add Redis cache for frequently accessed data

---

## Resources

- **GraphQL Playground**: http://localhost:4003/graphql
- **API Documentation**: http://localhost:4003/api-docs
- **Health Check**: http://localhost:4003/health
- **Kafka Topics**: View with Kafka UI or CLI tools

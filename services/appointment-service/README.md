# Appointment Service
Appointment management microservice for smart clinic platform. This service handle appointment scheduling, booking, cancellation, and rescheduling. It implements the **Saga Pattern** for distributed transaction management, **CQRS** for optimized read/write operations, and **Event Sourcing** for complete audit trails.

## Features

### Core Features
- Appointmnt CRUD operation
- Appointmnt booking with SAGA pattern (distributed transaction)
- Appointmnt cancellation with compensation
- Appointmnt rescheduling
- Appointment comfimation and completion
- Integrate with Doctor Service (availability check)
- MongoDB database integration
- Role-Base Access Control
- Input Validation
- Error Handling
- Request Logging
- Swagger UI API documentation
- Database seeding with sample appointment


### Architectural Patterns
- **Saga Pattern (Chorography)** - Distributed transaaction management for booking flow
- **CQRS (Command Query Responsibility Segregation)** - Separate read-optmized view for fash schedule queries
- **Event Sourching** - Complete audit trail of all appointment state changes
- **Outbox Pattern** - Guaranteed event publishing event if service fails
- **Circuit Breaker Pattern** - Resilience when calling external services
- **Event-Driven Architecture** - Kafka integration for publishing appointment events
- **GraphQL API** - Flexible GraphQL endpoint with Apollo Server
- **REST API** - Full REST endpoint with swagger documentation

------

## Implementation Steps

### Step 1: Project Setup

1. **Create Project structure**:
```
appointment-service/
|--src/
```

2. **Install dependencies**:
```bash
npm install express mongoose axios dotenv cors helmet express-validator winston express-async-errors swagger-ui-express swagger-jsdoc kafkajs apollo-server-express graphql @graphql-tools/schema opossum uuid
```

---
### Step 2: Configuration

1. **Create `src/config/index.js`** - Centralized configuration
2. **Create `src/config/database.js`** - MongoDB connection
2. **Create `src/config/swagger.js`** - Swagger/OpenAPI configuration
----

### Step 3: Models (CQRS + Event Sourcing)
1. **Create `src/models/Appointment.js`** - Appointment model
2. **Create `src/models/AppointmentReadView.js`** - Read-optimized model for CQRS
3. **Create `src/models/AppointmentEvent.js`** - Event sourcing model
4. **Create `src/models/OutboxEvent.js`** - Outbox pattern form guaranteed event publishing
----

### Step 4: Utlities

1. **Create `src/utils/logger.js` - Winston logger
2. **Create `src/utils/errors.js` - Custom error classes
3. **Create `src/utils/auth.js` - JWT token validation
4. **Create `src/utils/eventProducer.js` - kafka event producer
5. **Create `src/utils/circuitBreaker.js` - Circuit breaker utility

----

### Step 5: Service Clients
1. **Create `src/services/serviceClients.js``** - HTTP clients for external services with circuit breaker

### Step 6: Saga Orchestrator
1. **Create `src/services/sagaOrchestrator.js`** - Saga Pattern implementation for booking flow
- Check doctor avalilability
- Reserve slot
- Create appointment
- Create invoice
- Puiblish events
- Comensation logic

# Patient Service

## Features

### Core Features

- Patient CRUD Operation
- Medical history tracking
- Current medication tracking
- Emergency contact information
- Insurance information management
- MongoDB database integration
- Integration with auth service for authentication
- Role-based access control (RBAC)
- Input validation
- Error Handling
- Request Logger
- SWagger


# Advanced Pattern Implementaion
- Database per service - isolate patient dataabse
- CQRS (Command Query Responsibility Segregation) - Seprarate read-optimized views for fast queries
- Event-Driven Architectire - Kafka integration for publishing patient events
- GraphQL API - Flexible GraphQL endpoints with apollo server
- REST API - Full REST endpoints with swagger documentaion


---

## Implementation Steps

### Phase 1: Project Setup

#### Step 1.1: Initialize Project
```bash
mkdir patient-service
cd patient-service
npm init -y
```

#### Step 1.2: Install Core Dependencies
```bash
# Express and core dependenices
npm install express cors helmet dotenv express-async-errors

# MongoDB
npm install mongoose

# Validation
npm install express-validation joi

# Logging
npm install winston

# Swagger/OpenAPI
npm install swagger-ui-express swagger-jsdoc

# Development dependenices
npm install --save-dev nodemon
```


#### Step 1.3: Create project structrure
```bash
mkdir -p src/config,controllers,middlewares,models,routes,services,utils,scripts,graphql}
```

### Step 1.4: Create Configuration Files
- Create `.env` file with envirnment variables
- Create `.src/config/index.js` for configuration managemeent
- Create `.src/config/database.js` for MongoDb Connection
- Create `.src/config/swagger.js` for Swagger Documentation

---

### Phase 2: Database Setup (Database per Service Pattern)

#### Step 2.1: Create Patient Model
Create `src/models/Patient.js`:
- Define Mongoose Schema with all patient fields
- Add Validation rules
- Add static methods (findByUserId, findByEmail)
- Add instance methids (addMedicalHistory, AddAllergy etc)
- Export enums (GENDER, BLOOD_TYPE, PATIENT_STATUS)


#### 2.2: Connect to MongoDB
- Implement `src/config/database.js` with connection logic
- Add Connection error handling
- Add Graceful shutdown handling


----

### Phase 3: Core Service Layer

#### Step 3.1: Create Utlity Functions 
- `src/utils/logger.js` - Winston logger configuration
- `src/utils/errors.js` - Custom error classes (ValidationError, NotFoundError etc)
- `src/utils/auth.js` - Auth Service integration for token validation


#### 3.2: Create Patient Service
Create `src/services/patient.service.js`:

- Implement `createPatient()` - Create new patient
- Implement `getPatientById` - Get Patient by ID
- Implement `getPatientByUserId` - Get Patient by User ID
- Implement `getAllPatients` - List patients with pagination and filters
- Implement `updatePatient` - Update Patient information
- Implement `deletePatient` - Soft delete patient
- Implement `addMedicalHistory()` - Add Medical history item
- Implement `addAllergy()` - Add Allergy
- Implement `addMediacation()` - Add medication

-----


### Phase 4: REST API Implementation

#### Step 4.1: Create Middleware
- `src/middlewares/auth.middleware.js` - JWT authentication middleware
- `src/middlewares/rbac.middleware.js` - Role-based access control
- `src/middlewares/validator.middleware.js` - Input validation
- `src/middlewares/error.middleware.js` - Error Handling middleware

#### Step 4.2: Create Patient Controller
Create `src/controllers/patient.controller.js`:
- Implement controller methods that call service layer
- Handle request/response formatting
- Apply error handling


#### Step 4.3: Create Routes
Create `src/routes/patient.route.js`:
- Define REST endpoints
- Apply authentication middleware
- Applt RBAC middleware
- Apply validation middleware
- Connect routes to controller

Create `src/routes/health.routes.js`

- Health check endpoint
- Readiness check endpoint


#### Step 4.4: Setup Express App
Create `src/index.js`

- Initialize Express app
- Configure middleware (helmet, cors, body-parser)
- Setup Swagger UI
- Register routes
- Setup error handling
- Connect to database
- Start server

----

### Phase 5: CQRS Pattern Implementation

#### Step 5.1: Create Read Model
Create `src/models/PatientReadView.js`
- Define read-optimized schema with denormalized fields
- Add computer fields (fullName, age, city, state)
- Create text search indexes
- Create compound indexes for common queries
- Add static method `updateFromPatient()` to sync from write model
- Add static method `findById()` for optimized reads

#### Step 5.2: Update Patient Service for CQRS
Update `src/services/patient.service.js`:
- After each write operation, call `PatientReadView.updateFromPatient()`
- Modify `getAllPatients()` to use `PatientReadView` by default
- Keep `Patient` model for write operations
- Use read view for list/search queries

**Example**
```javascript
// In createPatient()
await patient.save();
await PatientReadView.updateFromPatient(patient); // CQRS sync

// In getAllPatient()
const patients = await PatientReadView.find(filter)
    .skip(skip)
    .limit(limit);

```


### Phase 6: Event_driven Architecture

#### Step 6.1: Install Kafka dependencies
```bash
npm install kafkajs
```

#### Step 6.2 Create Event Producer
Create `src/utils/eventProducer.js`:
- Initialize Kafka Producer
- Define event types (PatientCreated, PatientUpdated, etc.)
- Implement `publishEvent()` function
- Add graceful degradation (service continue is kafka unavailable)
- Add producer initialization and shutdown functions

#### Step 6.3 Publics Events in Service Layer
Update `src/services/patient.service.js`:
- After Each write operation, publish corresponding event
- Publish `PatientCreated` on patient creation
- Publish `PatientUpdated` on patient update
- Publish `PatientDeleted` on patient delete
- Publish `MedicalHistoryAdded` when adding medical history
- Publish `AllergyAdded` when adding allergy
- Publish `MedicationAdded` when adding medication

**Examle*
```javascript
    await publishEvent(EVENT_TYPE.PATIENT_CREATED), {
        patientId
    }

```


#### Step 6.4: Initialise kafka Producer
Update `src/index.js`
- Call `initializeProducer()` on server start
- Call `shutdownProducer()` on graceful shutdown


### Phase 7: GraphQl API Implementation

#### Step 7.1: Install the graphQl Dependencies
```bash
npm install apollo-server-express graphql @graphql-tools/schema
```

#### Step 7.2: Create GraphQl Schema
Create `src/graphql/schema.js`
- Define GraphQl types (Patients, Address, MedicalHistory, etc,)
- Define Query type(patient, patientByUserId, me, patients)
- Define Mutation type (createPatient, updatePatient, deletePatient, etc.)
- Define Input types for mutation

#### Step 7.3 Create GraphQl Context
Create `src/graphql/context.js`
- Extract JWT token from request headers
- Validate token with Auth service
- Return user information for resolver
- Handle authentication errors

#### Step 7.4 Create GraphQl Resolver
Create `src/graphql/resolver.js`
- Implement Query resolver
_ Implement Mutation resolver
- Add RBAC 
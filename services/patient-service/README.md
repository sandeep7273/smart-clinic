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

#### Step 3.1: Create Utility Function
- `src/utils/logger.js` - Winston logger configuration
- `src/utils/error.js` - Custom error classes (ValidationError, NotFoundError etc)
- `src/utils.auth.js` - Auth service integration for token validation


#### 3.2 Create Patient Service
Create `src/services/patient.service.js`:

- Implement `createPatient()` - Create new patient
- Implement `getPatientById` - Get Patient by ID
- Implement `getPatientByUserId` - Get Patient by User ID
- Implement `getAllPatients` - list patients with pagination and filters
- Implement `updatePatient` - Update Patient information
- Implement `deletePatient` - Soft delete Patient
- Implement `addMedicalHistory()` - Add Medical history item
- Implement `addAllergy()` - Add Allergy
- Implement `addMedication` - Add medication

-----


### Phose 4: REST API implementation

#### Step 4.1: Create Middleware
- `src/middleware/auth.middleware.js` - JWT authentication middleware
- `src/middleware/rbac.middleware.js` - Role-based access control middleware
- `src/middleware/validator.middleware.js` - Input validation middleware
- `src/middleware/error.middleware.js` - Error handling middleware

#### Step 4.2 Create Patient Controller
Create `src/controller/patient.controller.js`:
- Implement controller method that call service layer
- Handle request/response formatting
- Apply error handling


#### Step 4.3: Create Routes
Create `src/route/patient.route.js`:
- Define REST endpoints
- Apply authentication middleware
- Apply RBAC middleware
- Apply validation middleware
- Connect routes to controller

Create `src/route/health.route.js`:
- Health check endpoint
- Readiness check endpoint

#### Step 4.4: Setup Express app
Create `src/index.js`

- Initialize Express app
- Configure middleware (helmet, cors, body-parser)
- Setup Swagger UI
- Register routes
- Setup error handling
- Connect to database
- Start server

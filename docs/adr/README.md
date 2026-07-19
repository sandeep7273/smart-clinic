# Architecture Decision Record (ADR) - Smart Appointment System

This directory contains Architecture Decision Records (ADRs) documenting significant architectural decisions made during the development of the Smart Appointment System.

---

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

**Format**:
- **Title**: Short noun phrase
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: Forces at play (technical, political, social, project)
- **Decision**: Response to these forces
- **Consequences**: Context after applying the decision

---

## Active ADRs

### ADR-001: Microservices Architecture
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
The Smart Appointment System needs to be scalable, maintainable, and allow independent deployment of different functionalities. We need to support multiple teams working on different features simultaneously.

**Decision**:
Adopt a microservices architecture where each major functionality (authentication, appointments, notifications, etc.) is implemented as an independent service.

**Consequences**:
- ✅ Better scalability - can scale services independently
- ✅ Independent deployment - deploy services without affecting others
- ✅ Technology flexibility - can use different tech stacks per service
- ✅ Team autonomy - teams can work independently
- ❌ Increased complexity - need service discovery, inter-service communication
- ❌ Distributed system challenges - network latency, partial failures
- ⚠️ Need for API Gateway - centralized entry point required

---

### ADR-002: JWT-Based Authentication
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Need a stateless authentication mechanism that works well with microservices architecture and mobile applications. Session-based authentication would require shared session storage across services.

**Decision**:
Use JWT (JSON Web Tokens) with access tokens (short-lived, 15 minutes) and refresh tokens (long-lived, 7 days) for authentication.

**Consequences**:
- ✅ Stateless - no server-side session storage needed
- ✅ Scalable - works well with microservices
- ✅ Mobile-friendly - easy to use in mobile apps
- ✅ Self-contained - tokens include user information
- ❌ Cannot revoke access tokens before expiry
- ❌ Token size larger than session IDs
- ⚠️ Need secure token storage on client side
- ⚠️ Refresh token rotation strategy needed

**Implementation**: Completed in Auth Service v1.0.0

---

### ADR-003: MongoDB for Auth Service
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Auth Service needs a database for storing user accounts, credentials, and refresh tokens. Need flexibility in schema as user profile requirements may evolve.

**Decision**:
Use MongoDB with Mongoose ODM for the Auth Service.

**Consequences**:
- ✅ Flexible schema - easy to add new user fields
- ✅ Good performance for read-heavy operations
- ✅ JSON-like documents - natural fit for Node.js
- ✅ Horizontal scalability with sharding
- ✅ Built-in replication for high availability
- ❌ No ACID transactions across documents (acceptable for auth use case)
- ❌ Requires careful index design for performance
- ⚠️ Need to design schema carefully to avoid denormalization issues

**Implementation**: Completed in Auth Service v1.0.0

---

### ADR-004: React Native for Mobile Application
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Need to build mobile applications for both iOS and Android platforms. Want to maximize code reuse and reduce development time while maintaining native performance.

**Decision**:
Use React Native for cross-platform mobile development with TypeScript for type safety.

**Consequences**:
- ✅ Code reuse - ~90% code shared between iOS and Android
- ✅ Faster development - one codebase, two platforms
- ✅ Large ecosystem - many libraries available
- ✅ Hot reload - faster development iteration
- ✅ JavaScript/TypeScript - familiar to web developers
- ❌ Some native modules may need platform-specific code
- ❌ Performance not quite native (acceptable for our use case)
- ⚠️ Need to handle platform-specific UI differences
- ⚠️ Dependency on React Native version updates

**Implementation**: Completed Mobile App Phase 1

---

### ADR-005: Redux Toolkit for State Management
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Mobile app needs predictable state management for authentication, user data, and application state. Need developer tools for debugging.

**Decision**:
Use Redux Toolkit (modern Redux) for global state management in the mobile application.

**Consequences**:
- ✅ Predictable state - single source of truth
- ✅ Excellent DevTools - time-travel debugging
- ✅ Redux Toolkit - less boilerplate than classic Redux
- ✅ Middleware support - for async operations, logging
- ✅ Large community - many resources available
- ❌ Learning curve - Redux concepts (actions, reducers, slices)
- ❌ Boilerplate - even with Toolkit, still more code than Context API
- ⚠️ Need Redux Persist for persistent state

**Implementation**: Completed Mobile App Phase 1

---

### ADR-006: TypeScript for Mobile, JavaScript for Backend
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Need to choose between TypeScript and JavaScript for mobile app and backend services. Want type safety in mobile app but simpler setup for backend.

**Decision**:
- Mobile App: TypeScript for type safety and better IDE support
- Backend Services: JavaScript (ES2020+) with JSDoc for documentation

**Consequences**:

**Mobile (TypeScript)**:
- ✅ Type safety - catch errors at compile time
- ✅ Better IDE support - autocomplete, refactoring
- ✅ Self-documenting - types serve as documentation
- ✅ Large ecosystem - DefinitelyTyped for libraries
- ❌ Compilation step required
- ❌ Learning curve for TypeScript syntax

**Backend (JavaScript)**:
- ✅ Simpler setup - no compilation needed
- ✅ Faster iteration - no build step
- ✅ Familiar to more developers
- ✅ ES2020+ features - modern JavaScript
- ❌ No compile-time type checking
- ❌ Less IDE support compared to TypeScript
- ⚠️ Need careful testing and validation

**Implementation**: Completed in both Mobile App and Auth Service

---

### ADR-007: Secure Storage with Fallback Mechanism
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Mobile app needs to securely store authentication tokens. react-native-keychain provides native secure storage but may fail to load in development or have platform issues.

**Decision**:
Implement a dual-storage strategy:
- Primary: react-native-keychain for secure storage
- Fallback: AsyncStorage when Keychain is unavailable
- Check availability at runtime and use appropriate storage

**Consequences**:
- ✅ Robust - works even if Keychain fails
- ✅ Development-friendly - works in all environments
- ✅ Production-ready - uses secure storage when available
- ✅ Transparent - storage layer abstraction hides complexity
- ⚠️ AsyncStorage less secure than Keychain
- ⚠️ Need to inform users when using fallback storage
- ⚠️ Additional complexity in auth service layer

**Implementation**: Completed in Mobile App Phase 1

---

### ADR-008: CommonJS Modules for Backend
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Node.js supports both CommonJS (require/module.exports) and ES Modules (import/export). Need to choose module system for backend services.

**Decision**:
Use CommonJS modules (require/module.exports) for backend services.

**Consequences**:
- ✅ Better compatibility - works with all npm packages
- ✅ No "type": "module" in package.json required
- ✅ Simpler configuration
- ✅ More examples and resources available
- ❌ Older module system
- ❌ No top-level await
- ❌ Slight performance overhead vs ES modules
- ⚠️ May need to migrate to ES modules in future

**Implementation**: Completed in Auth Service

---

### ADR-009: Express.js for Backend Services
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Need to choose a web framework for backend microservices. Want mature, battle-tested framework with large ecosystem.

**Decision**:
Use Express.js 4.x for all backend microservices.

**Consequences**:
- ✅ Mature and stable - production-proven
- ✅ Large ecosystem - many middleware and plugins
- ✅ Large community - easy to find help
- ✅ Simple and unopinionated - flexibility in structure
- ✅ Excellent documentation
- ❌ No built-in validation - need external libraries
- ❌ Callback-based - need to use async/await carefully
- ⚠️ Need to establish consistent patterns across services

**Implementation**: Completed in Auth Service

---

### ADR-010: Zod for Input Validation
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Backend services need robust input validation to ensure data integrity and security. Want type-safe validation with good error messages.

**Decision**:
Use Zod for schema validation in backend services.

**Consequences**:
- ✅ Type-safe - can infer TypeScript types from schemas
- ✅ Composable - can build complex schemas from simple ones
- ✅ Good error messages - detailed validation errors
- ✅ Easy to use - intuitive API
- ✅ Runtime validation - catches errors before database
- ❌ Additional dependency
- ⚠️ Need to keep schemas in sync with models

**Implementation**: Completed in Auth Service

---

### ADR-011: Winston for Logging
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Need structured logging for backend services with support for multiple transports (console, files) and log rotation.

**Decision**:
Use Winston for logging in all backend services.

**Consequences**:
- ✅ Multiple transports - console, file, external services
- ✅ Log levels - error, warn, info, debug
- ✅ Structured logging - JSON format
- ✅ Log rotation - automatic file management
- ✅ Production-ready - widely used
- ❌ Configuration complexity for advanced features
- ⚠️ Need consistent logging patterns across services

**Implementation**: Completed in Auth Service

---

### ADR-012: bcrypt for Password Hashing
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Need secure password hashing algorithm that is slow enough to resist brute-force attacks but fast enough for good user experience.

**Decision**:
Use bcrypt with 12 salt rounds for password hashing.

**Consequences**:
- ✅ Industry standard - proven secure
- ✅ Adaptive - can increase rounds as hardware improves
- ✅ Salted - resistant to rainbow table attacks
- ✅ Slow by design - resistant to brute force
- ⚠️ 12 rounds chosen for balance of security and performance
- ⚠️ May need to adjust rounds in future

**Implementation**: Completed in Auth Service

---

### ADR-013: Rate Limiting Strategy
**Status**: Accepted  
**Date**: February 2026  
**Deciders**: Development Team

**Context**:
Need to prevent abuse and brute-force attacks on authentication endpoints while maintaining good user experience for legitimate users.

**Decision**:
Implement tiered rate limiting:
- General API: 100 requests per 15 minutes
- Login endpoint: 5 attempts per 15 minutes (skips successful requests)
- Registration: 3 accounts per hour per IP

**Consequences**:
- ✅ Prevents brute force attacks
- ✅ Prevents account enumeration
- ✅ Prevents mass account creation
- ✅ Tiered approach - stricter on sensitive endpoints
- ❌ Legitimate users might hit limits (rare with these limits)
- ⚠️ IP-based limiting - issues with NAT/proxies
- ⚠️ May need to adjust limits based on usage patterns

**Implementation**: Completed in Auth Service

---

## Deprecated ADRs

None yet.

---

## Superseded ADRs

None yet.

---

## Proposed ADRs (Under Consideration)

### ADR-014: Event-Driven Architecture for Service Communication
**Status**: Proposed  
**Context**: Services need to communicate. Options: REST API calls, message queue, event bus.

### ADR-015: Elasticsearch for Search Service
**Status**: Proposed  
**Context**: Need full-text search capabilities for doctors, appointments.

### ADR-016: Redis for Caching
**Status**: Proposed  
**Context**: Need caching layer to improve performance.

### ADR-017: Docker for Containerization
**Status**: Proposed  
**Context**: Need consistent deployment across environments.

### ADR-018: Kubernetes for Orchestration
**Status**: Proposed  
**Context**: Need container orchestration for production deployment.

---

## How to Add a New ADR

1. Copy the ADR template below
2. Fill in the sections
3. Submit for review
4. Once accepted, add to this index

### ADR Template

```markdown
# ADR-XXX: [Title]

**Status**: [Proposed | Accepted | Deprecated | Superseded]  
**Date**: [Date]  
**Deciders**: [Who made the decision]

## Context
[Describe the forces at play: technical, business, regulatory, etc.]

## Decision
[Describe the decision that was made]

## Consequences
[List positive, negative, and neutral consequences]
- ✅ Positive consequence
- ❌ Negative consequence
- ⚠️ Neutral or trade-off

## Alternatives Considered
[What other options were considered and why were they rejected]

## Implementation
[Status of implementation, references to code]

## Notes
[Any additional information]
```

---

**Last Updated**: February 3, 2026

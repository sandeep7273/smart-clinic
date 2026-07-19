# Smart Appointment System - Documentation

Welcome to the Smart Appointment System documentation. This directory contains all technical documentation, architectural decisions, API contracts, and guides.

---

## 📚 Documentation Index

### Getting Started
- **[Setup Guide](SETUP_GUIDE.md)** - Complete setup instructions for development environment
- **[Implementation Status](IMPLEMENTATION_STATUS.md)** - Current progress and completed features

### API Documentation
- **[Auth Service API Contract](api-contracts/AUTH_SERVICE.md)** - Complete API documentation for authentication service
- More service contracts coming soon...

### Architecture
- **[Architecture Decision Records (ADR)](adr/README.md)** - Key architectural decisions and their rationale
- Architecture diagrams - Coming soon

### Development Guides
- [Service README files](../services/) - Each service has its own detailed README
- [Mobile App Documentation](../mobile-app/README.md) - Mobile app setup and structure

---

## 🗂️ Directory Structure

```
docs/
├── README.md                          # This file
├── SETUP_GUIDE.md                     # Development environment setup
├── IMPLEMENTATION_STATUS.md           # Progress tracking and status
├── adr/                               # Architecture Decision Records
│   └── README.md                      # List of all ADRs
├── api-contracts/                     # API documentation for all services
│   └── AUTH_SERVICE.md               # Auth service API contract
├── architecture/                      # Architecture documentation (coming soon)
│   ├── system-overview.md
│   ├── microservices-architecture.md
│   └── data-flow.md
├── diagrams/                          # Architecture and sequence diagrams (coming soon)
│   ├── system-architecture.png
│   ├── auth-flow.png
│   └── appointment-booking-flow.png
└── runbooks/                          # Operational runbooks (coming soon)
    ├── deployment.md
    ├── monitoring.md
    └── troubleshooting.md
```

---

## 🎯 Quick Links

### For New Developers
1. Start with [Setup Guide](SETUP_GUIDE.md)
2. Review [Implementation Status](IMPLEMENTATION_STATUS.md)
3. Read [Architecture Decisions](adr/README.md)
4. Check relevant [API Contracts](api-contracts/)

### For Mobile Developers
1. [Mobile App Setup](../mobile-app/README.md)
2. [Auth Service API](api-contracts/AUTH_SERVICE.md)
3. Review Redux state management implementation

### For Backend Developers
1. [Auth Service Documentation](../services/auth-service/README.md)
2. [Auth Service API Contract](api-contracts/AUTH_SERVICE.md)
3. [Architecture Decisions](adr/README.md)

### For DevOps
1. [Setup Guide - Docker Section](SETUP_GUIDE.md#8-docker-setup-optional)
2. Service Dockerfiles in respective service directories
3. Infrastructure documentation (coming soon)

---

## 📊 Project Status

**Current Phase**: Early Development

**Completed Components**:
- ✅ Mobile App Phase 1 (Authentication UI/UX)
- ✅ Auth Service (Complete with API)

**In Progress**:
- None currently

**Next Up**:
- Mobile App Phase 2 (Backend Integration)
- API Gateway
- User Service

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for detailed progress.

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────┐
│   Mobile App    │
│  (React Native) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   API Gateway   │  ← Coming Soon
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│           Microservices                  │
├─────────────────────────────────────────┤
│  ✅ Auth Service                         │
│  📋 User Service                         │
│  📋 Doctor Service                       │
│  📋 Appointment Service                  │
│  📋 Notification Service                 │
│  📋 Search Service                       │
│  📋 AI Service                           │
└─────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│           Data Layer                     │
├─────────────────────────────────────────┤
│  MongoDB (Auth, User Data)               │
│  PostgreSQL (Appointments) - Coming Soon │
│  Redis (Cache) - Coming Soon             │
│  Elasticsearch (Search) - Coming Soon    │
└─────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Mobile | React Native + TypeScript | ✅ Implemented |
| API Gateway | Node.js + Express | 📋 Pending |
| Auth Service | Node.js + Express + MongoDB | ✅ Implemented |
| Other Services | Node.js + Express | 📋 Pending |
| Message Queue | RabbitMQ / Kafka | 📋 Pending |
| Cache | Redis | 📋 Pending |
| Search | Elasticsearch | 📋 Pending |
| Monitoring | Prometheus + Grafana | 📋 Pending |
| Logging | ELK Stack | 📋 Pending |
| Container | Docker | ✅ Dockerfiles Created |
| Orchestration | Kubernetes | 📋 Pending |

---

## 📖 Key Concepts

### Authentication Flow
1. User registers/logs in via mobile app
2. Auth service validates credentials
3. JWT access token (15 min) and refresh token (7 days) issued
4. Mobile app stores tokens securely (Keychain/AsyncStorage)
5. Access token used for API calls
6. Refresh token used to get new access token when expired

### Microservices Communication
- **REST APIs**: Primary communication method
- **Event Bus**: For async operations (planned)
- **API Gateway**: Single entry point (planned)

### Security
- **Authentication**: JWT-based
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: TLS/HTTPS, password hashing (bcrypt)
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Zod schemas

---

## 🔧 Development Workflow

### Branch Strategy
```
main              # Production-ready code
├── develop       # Integration branch
    ├── feature/* # Feature branches
    ├── bugfix/*  # Bug fix branches
    └── hotfix/*  # Urgent fixes
```

### Commit Convention
```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: mobile, auth-service, api-gateway, etc.

Example:
feat(auth-service): add email verification endpoint
fix(mobile): resolve keychain loading issue
docs(api): update auth service API contract
```

### Code Review Process
1. Create feature branch
2. Implement feature with tests
3. Update documentation
4. Create pull request
5. Code review
6. Merge to develop
7. Deploy to staging
8. Merge to main for production

---

## 📝 Documentation Standards

### API Documentation
- Use [api-contracts/](api-contracts/) folder
- Include request/response examples
- Document all error codes
- Specify rate limits
- Include authentication requirements

### Code Documentation
- JSDoc for functions and classes
- README in each service directory
- Inline comments for complex logic
- Architecture diagrams when applicable

### ADRs (Architecture Decision Records)
- Document significant decisions
- Include context and consequences
- Follow ADR template in [adr/README.md](adr/README.md)
- Review and update as needed

---

## 🧪 Testing

### Mobile App
- Unit tests with Jest
- Component tests with React Testing Library
- E2E tests with Detox (planned)

### Backend Services
- Unit tests with Jest (planned)
- Integration tests
- API tests with Supertest (planned)
- Load tests (planned)

### Documentation
- API contract examples tested with real service
- Setup guide verified on clean environment

---

## 🚀 Deployment

### Development
- Local development environment
- MongoDB local instance
- Mobile app on simulator/emulator

### Staging (Planned)
- Docker containers
- Cloud-hosted MongoDB
- Kubernetes cluster

### Production (Planned)
- Multi-region deployment
- Auto-scaling
- CDN for static assets
- Monitoring and alerting

---

## 📞 Support & Contact

### For Questions
- Check documentation first
- Review [Implementation Status](IMPLEMENTATION_STATUS.md)
- Check service-specific README files

### For Issues
- Check [Setup Guide troubleshooting](SETUP_GUIDE.md#5-troubleshooting)
- Review relevant ADRs
- Check GitHub issues

### For Contributions
- Follow development workflow
- Update documentation
- Write tests
- Follow code standards

---

## 📅 Documentation Maintenance

### Review Schedule
- **Weekly**: Update implementation status
- **Per Feature**: Update API contracts
- **Per Major Decision**: Create ADR
- **Monthly**: Review and update setup guide

### Version History
- **v1.0 (Feb 2026)**: Initial documentation
  - Setup guide
  - Implementation status
  - Auth service API contract
  - ADRs for completed work

---

## 🎓 Learning Resources

### Technologies Used
- **React Native**: [reactnative.dev](https://reactnative.dev)
- **Express.js**: [expressjs.com](https://expressjs.com)
- **MongoDB**: [docs.mongodb.com](https://docs.mongodb.com)
- **JWT**: [jwt.io](https://jwt.io)
- **Redux Toolkit**: [redux-toolkit.js.org](https://redux-toolkit.js.org)

### Best Practices
- **Microservices**: Martin Fowler's guides
- **API Design**: RESTful API best practices
- **Security**: OWASP guidelines
- **React Native**: Official best practices

---

## ✅ Documentation Checklist

When adding new features:
- [ ] Update [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)
- [ ] Create/update API contract in [api-contracts/](api-contracts/)
- [ ] Update service README
- [ ] Create ADR for significant decisions
- [ ] Update setup guide if needed
- [ ] Add diagrams if applicable
- [ ] Test all examples

---

**Last Updated**: February 3, 2026

**Maintained By**: Development Team

**Next Review**: When Phase 2 begins

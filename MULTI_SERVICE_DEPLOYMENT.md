# Multi-Service EC2 Deployment Guide

Complete guide for deploying Doctor Service, AI Service, and Appointment Service to AWS EC2 independently.

## Services Overview

| Service | Port | Purpose |
|---------|------|---------|
| Doctor Service | 4002 | Doctor management, search, availability |
| Appointment Service | 4003 | Appointment booking, SAGA pattern, CQRS |
| AI Service | 4004 | AI chatbot, intent detection, RAG |
| Auth Service | 4001 | Authentication & authorization |

## Prerequisites

- AWS Account with EC2 access
- MongoDB instance (MongoDB Atlas or self-hosted)
- Redis instance (for AI service)
- Docker installed on EC2 instances
- Security groups configured for each service's port

## Quick Start - Build All Services

```bash
# Build all services locally
cd services/doctor-service && ./docker-build.sh
cd ../ai-service && ./docker-build.sh
cd ../appointment-service && ./docker-build.sh
cd ../auth-service && ./docker-build.sh
```

## Service-Specific Configuration

### Doctor Service (Port 4002)

**Environment Variables (.env):**
```bash
NODE_ENV=production
PORT=4002
MONGODB_URI=mongodb://your-mongodb-host:27017/doctor-service
AUTH_SERVICE_URL=http://auth-service-ip:4001
KAFKA_BROKERS=your-kafka-broker:9092
LOG_LEVEL=info
```

**Build & Deploy:**
```bash
cd services/doctor-service

# Build image
docker build -t doctor-service:latest .

# Run container
docker run -d \
  --name doctor-service \
  -p 4002:4002 \
  --env-file .env \
  --restart unless-stopped \
  doctor-service:latest

# Verify
curl http://localhost:4002/health
```

**EC2 Security Group:**
- Port 4002: Custom TCP (your IP or 0.0.0.0/0)
- Port 22: SSH

### AI Service (Port 4004)

**Environment Variables (.env):**
```bash
NODE_ENV=production
PORT=4004
MONGODB_URI=mongodb://your-mongodb-host:27017/ai-service
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
GROQ_API_KEY=your-groq-api-key
CHROMADB_URL=http://localhost:8000
AUTH_SERVICE_URL=http://auth-service-ip:4001
DOCTOR_SERVICE_GRPC_URL=doctor-service-ip:50051
APPOINTMENT_SERVICE_GRPC_URL=appointment-service-ip:50052
LOG_LEVEL=info
```

**Build & Deploy:**
```bash
cd services/ai-service

# Build image
docker build -t ai-service:latest .

# Run container
docker run -d \
  --name ai-service \
  -p 4004:4004 \
  --env-file .env \
  --restart unless-stopped \
  ai-service:latest

# Verify
curl http://localhost:4004/health
```

**EC2 Security Group:**
- Port 4004: Custom TCP
- Port 22: SSH

**Additional Setup:**
- ChromaDB for vector storage (optional - can run in separate container)
- Redis for caching and context memory

### Appointment Service (Port 4003)

**Environment Variables (.env):**
```bash
NODE_ENV=production
PORT=4003
MONGODB_URI=mongodb://your-mongodb-host:27017/appointment-service
AUTH_SERVICE_URL=http://auth-service-ip:4001
DOCTOR_SERVICE_URL=http://doctor-service-ip:4002
DOCTOR_SERVICE_GRPC_URL=doctor-service-ip:50051
KAFKA_BROKERS=your-kafka-broker:9092
LOG_LEVEL=info
```

**Build & Deploy:**
```bash
cd services/appointment-service

# Build image
docker build -t appointment-service:latest .

# Run container
docker run -d \
  --name appointment-service \
  -p 4003:4003 \
  --env-file .env \
  --restart unless-stopped \
  appointment-service:latest

# Verify
curl http://localhost:4003/health
```

**EC2 Security Group:**
- Port 4003: Custom TCP
- Port 50052: Custom TCP (for gRPC)
- Port 22: SSH

## Deployment Strategies

### Option 1: All Services on One EC2 Instance

**Pros:** Simple, cost-effective for development
**Cons:** Single point of failure, resource contention

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Clone repository
git clone your-repo-url
cd smart-appointment-system

# Deploy all services
cd services/auth-service && docker build -t auth-service:latest . && \
  docker run -d --name auth-service -p 4001:4001 --env-file .env --restart unless-stopped auth-service:latest

cd ../doctor-service && docker build -t doctor-service:latest . && \
  docker run -d --name doctor-service -p 4002:4002 --env-file .env --restart unless-stopped doctor-service:latest

cd ../appointment-service && docker build -t appointment-service:latest . && \
  docker run -d --name appointment-service -p 4003:4003 --env-file .env --restart unless-stopped appointment-service:latest

cd ../ai-service && docker build -t ai-service:latest . && \
  docker run -d --name ai-service -p 4004:4004 --env-file .env --restart unless-stopped ai-service:latest

# Check all services
docker ps
```

### Option 2: Separate EC2 Instances (Recommended for Production)

Deploy each service on its own EC2 instance for better isolation and scalability.

**Service URLs Configuration:**
```bash
# In each service's .env, use actual EC2 IPs
AUTH_SERVICE_URL=http://54.123.45.1:4001
DOCTOR_SERVICE_URL=http://54.123.45.2:4002
APPOINTMENT_SERVICE_URL=http://54.123.45.3:4003
AI_SERVICE_URL=http://54.123.45.4:4004
```

### Option 3: Use Docker Compose

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  auth-service:
    build: ./services/auth-service
    ports:
      - "4001:4001"
    env_file: ./services/auth-service/.env
    restart: unless-stopped
    
  doctor-service:
    build: ./services/doctor-service
    ports:
      - "4002:4002"
      - "50051:50051"
    env_file: ./services/doctor-service/.env
    depends_on:
      - auth-service
    restart: unless-stopped
    
  appointment-service:
    build: ./services/appointment-service
    ports:
      - "4003:4003"
      - "50052:50052"
    env_file: ./services/appointment-service/.env
    depends_on:
      - auth-service
      - doctor-service
    restart: unless-stopped
    
  ai-service:
    build: ./services/ai-service
    ports:
      - "4004:4004"
    env_file: ./services/ai-service/.env
    depends_on:
      - auth-service
      - doctor-service
      - appointment-service
    restart: unless-stopped
```

Deploy:
```bash
docker-compose up -d
docker-compose ps
docker-compose logs -f
```

## Service Communication Matrix

```
┌─────────────────┐
│   Mobile App    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│   API Gateway   │ (Port 8080)
└────────┬────────┘
         │
         ├──────> Auth Service (4001)
         ├──────> Doctor Service (4002)
         ├──────> Appointment Service (4003)
         └──────> AI Service (4004)
                        │
                        ├──> Doctor Service (gRPC :50051)
                        └──> Appointment Service (gRPC :50052)
```

## Production Best Practices

### 1. Use Application Load Balancer

Create ALB to route traffic:
- `/auth/*` → Auth Service (4001)
- `/doctors/*` → Doctor Service (4002)
- `/appointments/*` → Appointment Service (4003)
- `/ai/*` → AI Service (4004)

### 2. Environment-Based Configuration

```bash
# Production
NODE_ENV=production
LOG_LEVEL=warn
DEBUG=false

# Use secrets manager for sensitive data
# Don't hardcode credentials in .env files
```

### 3. Monitoring & Logging

```bash
# Install CloudWatch Agent on each EC2
sudo yum install amazon-cloudwatch-agent -y

# Configure log collection
docker run -d \
  --name your-service \
  --log-driver=awslogs \
  --log-opt awslogs-region=us-east-1 \
  --log-opt awslogs-group=/ecs/your-service \
  your-service:latest
```

### 4. Auto-Scaling

Set up Auto Scaling Groups for each service:
- Min instances: 2
- Max instances: 10
- Target tracking: CPU 70%

### 5. Health Checks

All services have `/health` endpoint:
```bash
# Test health checks
curl http://service-ip:port/health

# Expected response
{
  "status": "healthy",
  "service": "service-name",
  "timestamp": "2026-02-20T12:00:00.000Z",
  "uptime": 12345
}
```

## Troubleshooting

### Service can't connect to MongoDB

```bash
# Test MongoDB connection
docker exec -it service-name node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected'))
  .catch(err => console.error(err));
"
```

### Service can't communicate with other services

```bash
# From EC2, test service connectivity
curl http://other-service-ip:port/health

# Check security group rules
# Ensure ports are open between services
```

### Container exits immediately

```bash
# Check logs
docker logs service-name

# Common issues:
# - Missing environment variables
# - MongoDB connection failed
# - Port already in use
```

## Cost Optimization

- **Use EC2 Reserved Instances** for production
- **Implement auto-scaling** to scale down during low traffic
- **Use spot instances** for non-critical environments
- **Share MongoDB/Redis** instances across services
- **Use AWS Fargate** for serverless container execution

## Maintenance

### Update a Service

```bash
# Pull latest code
cd service-directory
git pull

# Rebuild image
docker build -t service-name:latest .

# Stop old container
docker stop service-name
docker rm service-name

# Run new container
docker run -d --name service-name -p PORT:PORT --env-file .env --restart unless-stopped service-name:latest
```

### Backup Strategy

- **MongoDB**: Regular automated backups
- **Docker Images**: Store in Amazon ECR
- **Configuration**: Version control .env.example files

## Quick Reference Commands

```bash
# Build all services
for service in auth-service doctor-service appointment-service ai-service; do
  cd services/$service && docker build -t $service:latest . && cd ../..
done

# Stop all services
docker stop auth-service doctor-service appointment-service ai-service

# Remove all containers
docker rm auth-service doctor-service appointment-service ai-service

# View all logs
docker logs -f auth-service
docker logs -f doctor-service
docker logs -f appointment-service
docker logs -f ai-service

# Check resource usage
docker stats
```

## Support & Documentation

- [Auth Service Deployment](./auth-service/EC2_DEPLOYMENT.md)
- Each service has its own `docker-build.sh` for easy building
- Each service has health check endpoint at `/health`
- All services use port patterns: 400X (HTTP) and 5005X (gRPC)

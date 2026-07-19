# Deployment Scripts - Quick Reference

This directory contains automated deployment scripts for the Smart Appointment System.

## 📋 Overview

The deployment system consists of:
- **deploy.sh** - Automated build and deployment script
- **docker-compose.yml** - Production configuration (API Gateway only exposed)
- **docker-compose.dev.yml** - Development configuration (all ports exposed)

## 🚀 Quick Start

### Production Deployment

```bash
# Clean deployment (removes old containers and volumes)
./deploy.sh --clean

# Rebuild all images from scratch
./deploy.sh --clean --no-cache

# Deploy and show logs
./deploy.sh --clean --logs
```

### Development Deployment

```bash
# Use development configuration (exposes all service ports)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## 🔒 Security Model

### Production (docker-compose.yml)
**Only API Gateway port 3000 is exposed externally.**

All other services (auth, doctor, appointment, ai, mongodb, redis, kafka) are:
- ✅ Accessible within Docker network
- ❌ NOT accessible from outside
- 🔐 Secured by network isolation

**Public Access:**
- Port 3000 → API Gateway (GraphQL endpoint)

**Internal Only (No direct external access):**
- Port 4001 → Auth Service
- Port 4003 → Doctor Service (HTTP)
- Port 50051 → Doctor Service (gRPC)
- Port 4004 → Appointment Service (HTTP)
- Port 50052 → Appointment Service (gRPC)
- Port 4005 → AI Service
- Port 6379 → Redis
- Port 9092 → Kafka
- Port 27017 → MongoDB
- Port 2181 → Zookeeper

### Development (docker-compose.dev.yml)
**All service ports are exposed for debugging and testing.**

⚠️ **WARNING:** Never use docker-compose.dev.yml in production!

## 📦 Deployment Script Options

```bash
./deploy.sh [OPTIONS]

Options:
  --clean       Remove all containers and volumes before deployment
  --no-cache    Build images without using Docker cache
  --logs        Show logs after deployment
  --detach      Run containers in detached mode (default)
  --help        Show help message
```

## 🔍 What the Script Does

1. **Prerequisites Check**
   - Verifies all .env files exist
   - Checks Docker is running
   - Validates docker-compose is installed

2. **Cleanup (if --clean)**
   - Stops and removes containers
   - Removes volumes
   - Cleans up dangling images

3. **Build Images**
   - Builds all 5 service images:
     - kubsandeep/api-gateway-1000:latest
     - kubsandeep/auth-service-1001:latest
     - kubsandeep/doctor-service-1003:latest
     - kubsandeep/appointment-service-1004:latest
     - kubsandeep/ai-service-1005:latest

4. **Verify Images**
   - Confirms all images were built successfully

5. **Start Services**
   - Launches all services via docker-compose
   - Respects health checks and dependencies

6. **Health Monitoring**
   - Waits for services to report healthy
   - Max wait: 60 seconds

7. **Testing**
   - Tests API Gateway /health endpoint
   - Tests GraphQL endpoint

8. **Status Report**
   - Shows running containers
   - Displays accessible endpoints

## 🎯 Service Endpoints

### Production (docker-compose.yml)
```
Public:
  • API Gateway:        http://localhost:3000
  • API Health:         http://localhost:3000/health
  • GraphQL:            http://localhost:3000/graphql

All other services: Internal network only
```

### Development (docker-compose.dev.yml)
```
API Gateway:
  • Health:             http://localhost:3000/health
  • GraphQL:            http://localhost:3000/graphql

Auth Service:
  • Health:             http://localhost:4001/health
  • GraphQL:            http://localhost:4001/graphql

Doctor Service:
  • Health:             http://localhost:4003/health
  • GraphQL:            http://localhost:4003/graphql
  • gRPC:               localhost:50051

Appointment Service:
  • Health:             http://localhost:4004/health
  • GraphQL:            http://localhost:4004/graphql
  • gRPC:               localhost:50052

AI Service:
  • Health:             http://localhost:4005/health
  • GraphQL:            http://localhost:4005/graphql

Infrastructure:
  • MongoDB:            localhost:27017
  • Redis:              localhost:6379
  • Kafka:              localhost:9092
  • Zookeeper:          localhost:2181
```

## 📝 Common Commands

### Deployment

```bash
# First time deployment
./deploy.sh --clean --no-cache

# Update deployment after code changes
./deploy.sh --clean

# Quick rebuild (uses cache)
./deploy.sh
```

### Monitoring

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api-gateway
docker-compose logs -f doctor-service

# Check service status
docker-compose ps

# Check service health
docker-compose ps | grep healthy
```

### Maintenance

```bash
# Restart single service
docker-compose restart api-gateway

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Update and redeploy
git pull
./deploy.sh --clean --no-cache
```

## 🔧 Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs api-gateway

# Restart service
docker-compose restart api-gateway
```

### Build Failures

```bash
# Rebuild without cache
./deploy.sh --clean --no-cache

# Check Docker disk space
docker system df

# Clean up unused resources
docker system prune -a
```

### Port Conflicts

```bash
# Check what's using the port
lsof -i :3000

# Kill process using port (be careful!)
kill -9 <PID>

# Or change port in .env files
```

### Permission Denied

```bash
# Make script executable
chmod +x deploy.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
```

## 🌐 EC2 Deployment

For deploying to AWS EC2, see [EC2_DEPLOYMENT_GUIDE.md](EC2_DEPLOYMENT_GUIDE.md)

Key steps:
1. Set up EC2 instance (t3.large recommended)
2. Configure security group (only port 80, 443, and optionally 3000)
3. Install Docker and Docker Compose
4. Clone repository
5. Configure .env files
6. Run `./deploy.sh --clean`
7. Set up Nginx reverse proxy
8. Configure SSL with Let's Encrypt

## 📊 Environment Variables

Each service requires its own .env file:

```
api-gateway/.env.gateway
services/auth-service/.env.auth
services/doctor-service/.env.doctor
services/appointment-service/.env.appointment
services/ai-service/.env.ai
```

**Important Variables:**

```bash
# All services
NODE_ENV=production

# Service URLs (use Docker service names)
AUTH_SERVICE_URL=http://auth-service:4001
DOCTOR_SERVICE_URL=http://doctor-service:4003
APPOINTMENT_SERVICE_URL=http://appointment-service:4004
AI_SERVICE_URL=http://ai-service:4005

# Infrastructure (use Docker service names)
MONGODB_URI=mongodb://admin:password@mongodb:27017/...
REDIS_HOST=redis
KAFKA_BROKERS=kafka:9092

# gRPC
DOCTOR_GRPC_URL=doctor-service:50051
APPOINTMENT_GRPC_URL=appointment-service:50052
```

## 🔐 Production Security Checklist

- [ ] Only API Gateway port exposed
- [ ] Strong JWT secrets configured
- [ ] MongoDB authentication enabled
- [ ] Use MongoDB Atlas or secure self-hosted
- [ ] Nginx reverse proxy configured
- [ ] SSL/TLS certificates installed
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Firewall rules configured (UFW/Security Groups)
- [ ] Environment variables secured
- [ ] Logs monitored
- [ ] Backups configured
- [ ] Health checks working

## 📚 Additional Resources

- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Production deployment strategies
- [EC2_DEPLOYMENT_GUIDE.md](EC2_DEPLOYMENT_GUIDE.md) - AWS EC2 deployment guide
- [README.md](README.md) - Project overview

## 🆘 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify environment files exist and are correct
3. Check Docker is running: `docker ps`
4. Review security group rules (EC2)
5. Check disk space: `docker system df`
6. Try clean rebuild: `./deploy.sh --clean --no-cache`

---

**Quick Deploy Command for EC2:**

```bash
git clone <repo-url>
cd smart-appointment-system
# Configure .env files
./deploy.sh --clean --no-cache
```

That's it! Your system should be running and accessible at `http://your-ec2-ip:3000`

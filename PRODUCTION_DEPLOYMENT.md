# Production Deployment Guide

## Overview
This guide covers production-ready deployment strategies for the Smart Appointment System microservices architecture.

## Docker Compose Configuration

### Health Checks & Service Dependencies

The docker-compose.yml includes production-ready features:

#### 1. **Health Checks**
All services have health checks that verify actual readiness:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:PORT/health', ...)"]
  interval: 10s      # Check every 10 seconds
  timeout: 5s        # Timeout after 5 seconds
  retries: 5         # Try 5 times before marking unhealthy
  start_period: 30s  # Grace period during startup
```

#### 2. **Conditional Dependencies**
Services wait for dependencies to be **healthy**, not just started:

```yaml
depends_on:
  doctor-service:
    condition: service_healthy  # Wait until healthy
  kafka:
    condition: service_started  # Just wait for start
```

#### 3. **Restart Policies**
All services have `restart: unless-stopped` to recover from failures automatically.

### Service Startup Order

```
1. Infrastructure: MongoDB, Redis, Zookeeper, Kafka
2. Core Services: auth-service, doctor-service
3. Dependent Services: appointment-service (needs doctor-service)
4. AI Service: ai-service (needs redis)
5. API Gateway: api-gateway (needs ALL services to be healthy)
```

## API Gateway Resilience

### Retry Logic for Schema Stitching

The API Gateway implements retry logic when connecting to downstream GraphQL services:

**Features:**
- ✅ Waits up to 10 seconds (5 retries × 2s) for each service
- ✅ Continues federation even if some services are unavailable
- ✅ Logs detailed status for observability
- ✅ Gracefully degrades if services aren't ready

**Configuration:**
```javascript
const waitForService = async (checkFn, serviceName, maxRetries = 10, delayMs = 2000)
```

### GraphQL Introspection Settings

All microservices have `introspection: true` to allow the API Gateway to discover their schemas, even in production. This is necessary for schema stitching.

**Security Note:** Introspection is safe when behind an API Gateway with proper authentication.

## Deployment Strategies

### Option 1: Docker Compose (Development & Small Production)

**Start all services:**
```bash
docker-compose up -d
```

**View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway

# Check startup health
docker-compose ps
```

**Check health status:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Graceful shutdown:**
```bash
docker-compose down
```

### Option 2: Kubernetes (Production at Scale)

For production environments with high availability:

**Key Features:**
- Liveness & Readiness Probes (similar to Docker health checks)
- Horizontal Pod Autoscaling (HPA)
- Service Mesh (Istio/Linkerd) for observability
- Init Containers for dependency checking

**Example Readiness Probe:**
```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 4003
  initialDelaySeconds: 20
  periodSeconds: 10
  timeoutSeconds: 5
  successThreshold: 1
  failureThreshold: 3
```

### Option 3: AWS ECS/EC2 (Cloud Production)

**Architecture:**
- Application Load Balancer → API Gateway
- Target Groups with health checks
- Auto Scaling Groups for each service
- CloudWatch for monitoring and alerts

**Health Check Settings:**
- Interval: 30s
- Timeout: 5s
- Healthy threshold: 2
- Unhealthy threshold: 3

## Environment Variables

### Critical Environment Variables

**API Gateway (.env.gateway):**
```env
NODE_ENV=production
PORT=3000
DOCTOR_SERVICE_URL=http://doctor-service:4003
APPOINTMENT_SERVICE_URL=http://appointment-service:4004
AI_SERVICE_URL=http://ai-service:4005
```

**Doctor Service (.env.doctor):**
```env
PORT=4003
GRPC_PORT=50051
KAFKA_BROKERS=kafka:9092
MONGODB_URI=mongodb://mongodb:27017/doctor_db
```

### Docker Network Naming

When services communicate within Docker Compose:
- Use service names: `http://doctor-service:4003`
- NOT localhost: ~~`http://localhost:4003`~~

## Troubleshooting

### Issue: API Gateway shows "No GraphQL services available"

**Diagnosis:**
```bash
# Check if downstream services are healthy
docker-compose ps

# Check API Gateway logs
docker logs smart-appointment-system-api-gateway-1 | grep GraphQL

# Test downstream service directly
curl http://localhost:4003/graphql -d '{"query":"{ __typename }"}'
```

**Solutions:**
1. Ensure all services have `introspection: true` in Apollo Server config
2. Verify health checks are passing
3. Check service URLs in .env files use Docker service names
4. Restart API Gateway: `docker-compose restart api-gateway`

### Issue: Services fail health checks

**Diagnosis:**
```bash
# Check specific service health
docker inspect smart-appointment-system-doctor-service-1 | grep Health -A 10

# Manual health check
docker exec smart-appointment-system-doctor-service-1 \
  wget -O- http://localhost:4003/health
```

**Solutions:**
1. Increase `start_period` in health check (especially for services with DB migrations)
2. Check MongoDB/Kafka connectivity
3. Review service logs for startup errors

### Issue: Kafka connection errors

**Diagnosis:**
```bash
docker logs smart-appointment-system-kafka-1
```

**Solutions:**
1. Ensure `KAFKA_ADVERTISED_HOST_NAME=kafka` (not localhost)
2. Check zookeeper is running: `docker ps | grep zookeeper`
3. Services should use `KAFKA_BROKERS=kafka:9092`

## Monitoring & Observability

### Health Endpoints

All services expose `/health` endpoint:

```bash
curl http://localhost:3000/health  # API Gateway
curl http://localhost:4001/health  # Auth Service
curl http://localhost:4003/health  # Doctor Service
curl http://localhost:4004/health  # Appointment Service
curl http://localhost:4005/health  # AI Service
```

### Production Monitoring Stack (Recommended)

1. **Prometheus** - Metrics collection
2. **Grafana** - Visualization
3. **Loki** - Log aggregation
4. **Jaeger/Zipkin** - Distributed tracing

### Key Metrics to Monitor

- **Request Rate**: Requests per second per service
- **Error Rate**: 4xx/5xx responses
- **Latency**: p50, p95, p99 response times
- **Saturation**: CPU, Memory, Disk usage
- **GraphQL Operations**: Query/Mutation success rates

## Security Best Practices

### 1. Network Isolation
```yaml
networks:
  frontend:  # API Gateway, Load Balancer
  backend:   # Services, Databases
  data:      # Databases only
```

### 2. Secrets Management
- Use Docker secrets or environment variable encryption
- Never commit `.env` files with real credentials
- Rotate JWT secrets regularly

### 3. Rate Limiting
API Gateway has built-in rate limiting:
```env
RATE_LIMIT_MAX_REQUESTS=100  # per window
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
```

### 4. CORS Configuration
```env
CORS_ORIGIN=https://yourdomain.com  # Not *
```

## Performance Optimization

### 1. Connection Pooling
MongoDB connection pooling is enabled by default with proper limits.

### 2. Caching
- Redis for AI service caching
- API Gateway response caching (implement based on needs)

### 3. Load Balancing
Use multiple replicas with Docker Compose:
```yaml
doctor-service:
  deploy:
    replicas: 3
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
```

## Backup & Recovery

### Database Backups
```bash
# MongoDB backup
docker exec smart-appointment-system-mongodb-1 \
  mongodump --out /backup/$(date +%Y%m%d)

# Copy backup out of container
docker cp smart-appointment-system-mongodb-1:/backup ./backups/
```

### Disaster Recovery Plan
1. Automated daily backups
2. Off-site backup storage
3. Tested restore procedures
4. RTO (Recovery Time Objective): < 1 hour
5. RPO (Recovery Point Objective): < 24 hours

## Scaling Strategies

### Horizontal Scaling
Each service can be scaled independently:
```bash
docker-compose up -d --scale doctor-service=3 --scale appointment-service=2
```

### Vertical Scaling
Adjust resource limits in docker-compose.yml:
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Health checks passing
- [ ] GraphQL introspection working
- [ ] Authentication tested
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] Monitoring/alerts set up
- [ ] Backup strategy implemented
- [ ] SSL/TLS certificates installed
- [ ] Load testing completed
- [ ] Rollback plan documented

## Support & Troubleshooting

For issues:
1. Check service logs: `docker-compose logs -f [service-name]`
2. Verify health status: `docker-compose ps`
3. Test endpoints manually with curl
4. Review this documentation
5. Check GitHub issues/discussions

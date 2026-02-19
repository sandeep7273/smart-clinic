# Auth Service - Docker Quick Start

## Quick Build & Run

### 1. Prepare environment file
```bash
cp .env.example .env
# Edit .env with your actual values (MongoDB URI, JWT secrets, etc.)
```

### 2. Build the image
```bash
docker build -t auth-service:latest .
```

### 3. Run the container
```bash
docker run -d \
  --name auth-service \
  -p 4001:4001 \
  --env-file .env \
  --restart unless-stopped \
  auth-service:latest
```

### 4. Check status
```bash
# View logs
docker logs -f auth-service

# Check health
curl http://localhost:4001/health

# Check container status
docker ps | grep auth-service
```

## Using the Build Script

```bash
# Make script executable (first time only)
chmod +x docker-build.sh

# Run the build script
./docker-build.sh
```

The script will:
- Build the Docker image
- Optionally test run the container
- Verify the health endpoint

## Environment Variables (Required for EC2)

Before deploying to EC2, ensure these are set:

```bash
NODE_ENV=production
PORT=4001
MONGODB_URI=mongodb://your-mongodb-host:27017/auth-service
JWT_ACCESS_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

## Docker Commands Reference

```bash
# Build
docker build -t auth-service:latest .

# Run in production mode
docker run -d --name auth-service -p 4001:4001 --env-file .env --restart unless-stopped auth-service:latest

# Stop container
docker stop auth-service

# Remove container
docker rm auth-service

# View logs
docker logs -f auth-service

# Execute command in container
docker exec -it auth-service sh

# View resource usage
docker stats auth-service

# Inspect container
docker inspect auth-service
```

## Troubleshooting

### Container exits immediately
```bash
# Check logs for errors
docker logs auth-service

# Common issues:
# - MongoDB connection failed (check MONGODB_URI)
# - Port 4001 already in use (check: lsof -i :4001)
# - Missing required environment variables
```

### Health check failing
```bash
# Test from inside container
docker exec auth-service wget -qO- http://localhost:4001/health

# Test from host
curl http://localhost:4001/health
```

### Cannot connect to MongoDB
```bash
# If using localhost, use host.docker.internal instead
MONGODB_URI=mongodb://host.docker.internal:27017/auth-service

# If using MongoDB Atlas, ensure IP whitelist includes your EC2 IP
```

## Multi-Container Setup (with Docker Compose)

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  auth-service:
    build: .
    ports:
      - "4001:4001"
    env_file: .env
    restart: unless-stopped
```

Run:
```bash
docker-compose up -d
docker-compose logs -f
```

## For Production EC2 Deployment

See [EC2_DEPLOYMENT.md](./EC2_DEPLOYMENT.md) for comprehensive production deployment guide.

# Auth Service - EC2 Deployment Guide

This guide covers deploying the auth-service Docker container to AWS EC2.

## Prerequisites

- AWS Account with EC2 access
- Docker installed on EC2 instance
- MongoDB instance (can be MongoDB Atlas or self-hosted)
- Security group configured to allow:
  - Port 4001 (auth-service)
  - Port 22 (SSH)
  - Port 443/80 (if using ALB)

## Environment Variables

Create a `.env` file or export these environment variables on your EC2 instance:

```bash
# Server Configuration
NODE_ENV=production
PORT=4001

# MongoDB Configuration
MONGODB_URI=mongodb://your-mongodb-host:27017/auth-service
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/auth-service?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration (comma-separated origins)
ALLOWED_ORIGINS=http://your-frontend-domain.com,https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_REGISTER_MAX=3

# Logging
LOG_LEVEL=info
```

## Build Instructions

### 1. Build Docker Image Locally (Optional - for testing)

```bash
cd /path/to/services/auth-service
docker build -t auth-service:latest .
```

### 2. Test Locally

```bash
# Create .env file with your configuration
docker run -d \
  --name auth-service \
  -p 4001:4001 \
  --env-file .env \
  auth-service:latest

# Check logs
docker logs -f auth-service

# Test health endpoint
curl http://localhost:4001/health
```

## EC2 Deployment Steps

### Option 1: Direct Deployment on EC2

#### Step 1: Connect to EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

#### Step 2: Install Docker (Amazon Linux 2)

```bash
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user
```

Log out and back in for group changes to take effect.

#### Step 3: Transfer Code to EC2

Option A - Using Git:
```bash
cd /home/ec2-user
git clone your-repo-url
cd smart-appointment-system/services/auth-service
```

Option B - Using SCP:
```bash
# From local machine
scp -i your-key.pem -r ./services/auth-service ec2-user@your-ec2-ip:/home/ec2-user/
```

#### Step 4: Create Environment File

```bash
cd /home/ec2-user/auth-service
nano .env
# Paste your environment variables and save
```

#### Step 5: Build and Run

```bash
# Build the image
docker build -t auth-service:latest .

# Run the container
docker run -d \
  --name auth-service \
  -p 4001:4001 \
  --env-file .env \
  --restart unless-stopped \
  auth-service:latest
```

#### Step 6: Verify Deployment

```bash
# Check container status
docker ps

# Check logs
docker logs -f auth-service

# Test the service
curl http://localhost:4001/health

# Test from outside (replace with your EC2 public IP)
curl http://your-ec2-public-ip:4001/health
```

### Option 2: Using Docker Compose

#### Step 1: Create docker-compose.yml

```yaml
version: '3.8'

services:
  auth-service:
    build: .
    container_name: auth-service
    ports:
      - "4001:4001"
    environment:
      - NODE_ENV=production
      - PORT=4001
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### Step 2: Deploy with Docker Compose

```bash
# Install Docker Compose (if not installed)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Deploy
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Option 3: Using Amazon ECR + ECS (Recommended for Production)

#### Step 1: Push to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name auth-service --region us-east-1

# Tag image
docker tag auth-service:latest your-account-id.dkr.ecr.us-east-1.amazonaws.com/auth-service:latest

# Push image
docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/auth-service:latest
```

#### Step 2: Create ECS Task Definition

See AWS ECS documentation for creating task definitions using the ECR image.

## Production Considerations

### 1. Use Application Load Balancer (ALB)

- Configure ALB to route traffic to EC2 instances
- Use ALB health checks pointing to `/health` endpoint
- Enable HTTPS with SSL/TLS certificate

### 2. Auto Scaling

Configure Auto Scaling Group:
- Min instances: 2
- Max instances: 10
- Target tracking on CPU/Memory or request count

### 3. Monitoring

Install CloudWatch Agent:
```bash
sudo yum install amazon-cloudwatch-agent -y
```

Configure container logging:
```bash
docker run -d \
  --name auth-service \
  -p 4001:4001 \
  --env-file .env \
  --log-driver=awslogs \
  --log-opt awslogs-region=us-east-1 \
  --log-opt awslogs-group=/ecs/auth-service \
  --log-opt awslogs-stream=auth-service-container \
  auth-service:latest
```

### 4. Security Best Practices

- Store secrets in AWS Secrets Manager or Parameter Store
- Use IAM roles for EC2 instead of access keys
- Regularly update base images and dependencies
- Enable VPC security groups with minimal ports open
- Use private subnets for database connections

### 5. Backup and Disaster Recovery

- Regular MongoDB backups
- Store Docker images in ECR with versioning
- Document rollback procedures

## Updating the Service

### Rolling Update

```bash
# Pull latest code
cd /home/ec2-user/auth-service
git pull origin main

# Build new image
docker build -t auth-service:latest .

# Stop and remove old container
docker stop auth-service
docker rm auth-service

# Run new container
docker run -d \
  --name auth-service \
  -p 4001:4001 \
  --env-file .env \
  --restart unless-stopped \
  auth-service:latest
```

### Zero-Downtime Update (with ALB)

1. Deploy new version to new EC2 instance
2. Add new instance to target group
3. Wait for health checks to pass
4. Remove old instance from target group
5. Terminate old instance

## Troubleshooting

### Container not starting

```bash
# Check logs
docker logs auth-service

# Check if port is in use
sudo netstat -tlnp | grep 4001

# Inspect container
docker inspect auth-service
```

### Health check failing

```bash
# Test health endpoint
curl -v http://localhost:4001/health

# Check MongoDB connection
docker exec -it auth-service node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(err => console.error(err))"
```

### Performance issues

```bash
# Check resource usage
docker stats auth-service

# View detailed logs
docker logs --tail 100 -f auth-service
```

## Cost Optimization

- Use EC2 Reserved Instances or Savings Plans for production
- Consider AWS Fargate for serverless container execution
- Implement auto-scaling to scale down during low traffic
- Use spot instances for non-critical environments

## Support

For issues or questions, refer to:
- Application logs: `docker logs auth-service`
- CloudWatch Logs (if configured)
- Health endpoint: `http://your-service/health`

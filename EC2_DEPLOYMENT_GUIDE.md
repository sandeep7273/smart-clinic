# EC2 Deployment Guide

This guide provides step-by-step instructions for deploying the Smart Appointment System on AWS EC2.

## Table of Contents

- [Prerequisites](#prerequisites)
- [EC2 Instance Setup](#ec2-instance-setup)
- [Security Group Configuration](#security-group-configuration)
- [Server Preparation](#server-preparation)
- [Application Deployment](#application-deployment)
- [Security Best Practices](#security-best-practices)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- AWS Account with EC2 access
- SSH key pair for EC2 instance access
- Domain name (optional, for SSL/TLS)
- Basic knowledge of Linux and Docker

## EC2 Instance Setup

### 1. Instance Specifications

**Recommended Instance Types:**

- **Development/Testing**: t3.medium (2 vCPU, 4GB RAM)
- **Production**: t3.large or t3.xlarge (2-4 vCPU, 8-16GB RAM)
- **High Traffic**: c5.xlarge or better

**Storage:**

- Minimum: 30GB EBS volume
- Recommended: 50GB+ EBS volume with provisioned IOPS

**Operating System:**

- Ubuntu 22.04 LTS (recommended)
- Amazon Linux 2023
- Ubuntu 20.04 LTS

### 2. Launch EC2 Instance

```bash
# Using AWS CLI (optional)
aws ec2 run-instances \
  --image-id ami-xxxxxxxxx \
  --instance-type t3.large \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=smart-appointment-system}]'
```

Or use the AWS Console:

1. Navigate to EC2 Dashboard
2. Click "Launch Instance"
3. Select Ubuntu 22.04 LTS AMI
4. Choose instance type (t3.large recommended)
5. Configure storage (50GB minimum)
6. Add tags: Name = smart-appointment-system
7. Review and launch

## Security Group Configuration

### Inbound Rules

**CRITICAL: Only expose necessary ports!**

```
Port 22    - SSH (Your IP only) - For management
Port 80    - HTTP - For web traffic (will redirect to HTTPS)
Port 443   - HTTPS - For secure web traffic
Port 3000  - API Gateway (temporary, use reverse proxy in production)
```

**Example Security Group:**

| Type   | Protocol | Port Range | Source     | Description                    |
| ------ | -------- | ---------- | ---------- | ------------------------------ |
| SSH    | TCP      | 22         | Your IP/32 | SSH access                     |
| HTTP   | TCP      | 80         | 0.0.0.0/0  | HTTP web traffic               |
| HTTPS  | TCP      | 443        | 0.0.0.0/0  | HTTPS web traffic              |
| Custom | TCP      | 3000       | 0.0.0.0/0  | API Gateway (dev/testing only) |

**DO NOT expose these ports:**

- 4001 (auth-service)
- 4003, 50051 (doctor-service)
- 4004, 50052 (appointment-service)
- 4005 (ai-service)
- 6379 (Redis)
- 9092 (Kafka)
- 27017 (MongoDB)
- 2181 (Zookeeper)

### Security Group via AWS CLI

```bash
# Create security group
aws ec2 create-security-group \
  --group-name smart-appointment-sg \
  --description "Security group for Smart Appointment System"

# Add SSH access (replace YOUR_IP)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32

# Add HTTP access
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Add HTTPS access
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Add API Gateway access (temporary)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0
```

## Server Preparation

### 1. Connect to EC2 Instance

```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update system packages
sudo apt-get update && sudo apt-get upgrade -y
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker ubuntu

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
```

### 3. Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 4. Install Git

```bash
# Install Git
sudo apt-get install git -y

# Verify installation
git --version
```

### 5. Configure Firewall (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (IMPORTANT: Do this BEFORE enabling UFW!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow API Gateway (temporary)
sudo ufw allow 3000/tcp

# Check status
sudo ufw status
```

## Application Deployment

### 1. Clone Repository

```bash
# Clone your repository
cd /home/ubuntu
git clone https://github.com/your-username/smart-appointment-system.git
cd smart-appointment-system
```

### 2. Configure Environment Files

```bash
# Update environment files with production settings
nano api-gateway/.env.gateway
nano services/auth-service/.env.auth
nano services/doctor-service/.env.doctor
nano services/appointment-service/.env.appointment
nano services/ai-service/.env.ai
```

**Important Environment Variables:**

```bash
# api-gateway/.env.gateway
NODE_ENV=production
PORT=3000
GW_AUTH_SERVICE_URL=http://auth-service:4001
DOCTOR_SERVICE_URL=http://doctor-service:4003
APPOINTMENT_SERVICE_URL=http://appointment-service:4004
AI_SERVICE_URL=http://ai-service:4005

# services/auth-service/.env.auth
NODE_ENV=production
PORT=4001
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-secure-random-secret-here
KAFKA_BROKERS=kafka:9092

# services/doctor-service/.env.doctor
NODE_ENV=production
PORT=4003
GRPC_PORT=50051
MONGODB_URI=your-production-mongodb-uri
KAFKA_BROKERS=kafka:9092
API_GATEWAY_URL=http://api-gateway:3000

# services/appointment-service/.env.appointment
NODE_ENV=production
PORT=4004
GRPC_PORT=50052
MONGODB_URI=your-production-mongodb-uri
KAFKA_BROKERS=kafka:9092
DOCTOR_GRPC_URL=doctor-service:50051

# services/ai-service/.env.ai
NODE_ENV=production
PORT=4005
REDIS_HOST=redis
REDIS_PORT=6379
DOCTOR_SERVICE_GRPC_HOST=doctor-service
APPOINTMENT_SERVICE_GRPC_HOST=appointment-service
```

### 3. Run Deployment Script

```bash
# Make deployment script executable (if not already)
chmod +x deploy.sh

# Run deployment
./deploy.sh --clean

# Or with no-cache option to rebuild everything
./deploy.sh --clean --no-cache
```

### 4. Verify Deployment

```bash
# Check service status
docker-compose ps

# Check logs
docker-compose logs -f api-gateway

# Test API Gateway
curl http://localhost:3000/health

# Test GraphQL endpoint
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

## Security Best Practices

### 1. Set Up Nginx Reverse Proxy

**Why?**

- SSL/TLS termination
- Hide internal ports
- Load balancing
- Better security

**Install Nginx:**

```bash
sudo apt-get install nginx -y
```

**Configure Nginx:**

```bash
sudo nano /etc/nginx/sites-available/smart-appointment-system
```

Add configuration:

```nginx
upstream api_gateway {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (get from Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy settings
    location / {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://api_gateway/health;
        access_log off;
    }
}
```

**Enable site:**

```bash
sudo ln -s /etc/nginx/sites-available/smart-appointment-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3. Configure Docker Compose for Production

**Update docker-compose.yml to remove port 3000 exposure:**

```yaml
api-gateway:
  image: kubsandeep/api-gateway-1000:latest
  # Remove port mapping - access via Nginx only
  # ports:
  #   - "3000:3000"
  env_file:
    - api-gateway/.env.gateway
  # ... rest of config
```

**Then redeploy:**

```bash
docker-compose down
docker-compose up -d
```

### 4. Environment Variable Security

```bash
# NEVER commit .env files to Git
# Use AWS Secrets Manager or similar

# Example: Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name smart-appointment/jwt-secret \
  --secret-string "your-super-secret-key"

# Retrieve in your application
aws secretsmanager get-secret-value \
  --secret-id smart-appointment/jwt-secret \
  --query SecretString \
  --output text
```

### 5. MongoDB Security

**Use MongoDB Atlas (Recommended):**

- Managed service with built-in security
- Automatic backups
- Encryption at rest and in transit

**Or secure self-hosted MongoDB:**

```yaml
# In docker-compose.yml
mongodb:
  image: mongo:6.0
  # DO NOT expose port in production
  # ports:
  #   - "27017:27017"
  environment:
    MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
  volumes:
    - mongodb_data:/data/db
  command: --auth --bind_ip_all
```

## Monitoring and Maintenance

### 1. Set Up CloudWatch Logging

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### 2. Docker Container Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api-gateway

# Save logs to file
docker-compose logs > deployment.log
```

### 3. Set Up Monitoring Dashboard

**Install Prometheus and Grafana (optional):**

```bash
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus_data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'

grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  volumes:
    - grafana_data:/var/lib/grafana
```

### 4. Automated Backups

```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash
# Backup MongoDB data
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MongoDB volumes
docker run --rm \
  --volumes-from $(docker-compose ps -q mongodb) \
  -v $BACKUP_DIR:/backup \
  ubuntu tar czf /backup/mongodb_$DATE.tar.gz /data/db

# Keep only last 7 days of backups
find $BACKUP_DIR -name "mongodb_*.tar.gz" -mtime +7 -delete

echo "Backup completed: mongodb_$DATE.tar.gz"
```

```bash
# Make executable
chmod +x backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/smart-appointment-system/backup.sh
```

### 5. Health Monitoring Script

```bash
# Create monitoring script
nano monitor.sh
```

```bash
#!/bin/bash
# Monitor service health

ENDPOINTS=(
  "http://localhost:3000/health"
)

for endpoint in "${ENDPOINTS[@]}"; do
  if curl -sf "$endpoint" > /dev/null; then
    echo "✓ $endpoint is healthy"
  else
    echo "✗ $endpoint is DOWN"
    # Send alert (email, Slack, etc.)
    # Example: Send SNS notification
    aws sns publish \
      --topic-arn arn:aws:sns:region:account:topic \
      --message "Service down: $endpoint"
  fi
done
```

## Troubleshooting

### Service Won't Start

```bash
# Check Docker service
sudo systemctl status docker

# Check container logs
docker-compose logs <service-name>

# Check disk space
df -h

# Check memory
free -m

# Restart service
docker-compose restart <service-name>
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Increase EC2 instance size
# Or add swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Cannot Connect to Service

```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx

# Check UFW status
sudo ufw status

# Check if service is listening
sudo netstat -tlnp | grep :3000

# Check Docker network
docker network ls
docker network inspect smart-appointment-system_default
```

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

### Database Connection Issues

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection from service
docker-compose exec api-gateway sh
nc -zv mongodb 27017
```

## Quick Reference Commands

```bash
# Deploy/Redeploy
./deploy.sh --clean

# Stop all services
docker-compose down

# Start all services
docker-compose up -d

# Restart single service
docker-compose restart api-gateway

# View logs
docker-compose logs -f

# Check service status
docker-compose ps

# Remove everything (including volumes)
docker-compose down -v

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Update application
git pull
./deploy.sh --clean --no-cache
```

## Cost Optimization

### 1. Use AWS Cost Explorer

- Monitor EC2 instance costs
- Set up billing alerts

### 2. Right-Size Instance

- Start with t3.medium
- Monitor CPU and memory usage
- Scale up only if needed

### 3. Use Reserved Instances

- 30-40% savings for long-term deployments
- 1 or 3-year commitments

### 4. Implement Auto-Scaling (Advanced)

- Use ECS or Kubernetes for auto-scaling
- Scale based on traffic patterns

## Support and Resources

- **AWS Documentation**: https://docs.aws.amazon.com/ec2/
- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose**: https://docs.docker.com/compose/
- **Let's Encrypt**: https://letsencrypt.org/
- **Nginx**: https://nginx.org/en/docs/

---

**Last Updated**: February 2026
**Maintainer**: Smart Appointment System Team

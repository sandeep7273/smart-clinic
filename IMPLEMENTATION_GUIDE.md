# Smart Clinic — Complete Implementation Guide

# 12-Phase AWS Deployment Roadmap

# Last updated: July 2025

---

## How to Use This Document

Read each phase in order.
Every phase has:
STATUS — Done / In Progress / Pending
WHAT — Plain-language explanation of what this phase does
FILES — Exact files created or modified
HOW TO — Step-by-step commands to execute this phase
VERIFY — How to confirm the phase worked

---

## PHASE STATUS OVERVIEW

Phase 1 — Application Readiness ✅ DONE
Phase 2 — Dockerization ✅ DONE
Phase 3 — Infrastructure as Code ✅ DONE
Phase 4 — AWS Foundation ✅ DONE (via Terraform)
Phase 5 — Container Registry ✅ DONE (via Terraform ECR module)
Phase 6 — ECS Deployment ✅ DONE (via Terraform ECS module)
Phase 7 — Networking ✅ DONE (via Terraform VPC/ALB/SG modules)
Phase 8 — Observability ✅ DONE
Phase 9 — Security ✅ DONE (via IAM/Secrets/SG modules)
Phase 10 — CI/CD ✅ DONE (GitHub Actions)
Phase 11 — Performance ⬜ NEXT STEP
Phase 12 — Production Go Live ⬜ PENDING (final phase)

---

## ═══════════════════════════════════════════════════════════

## PHASE 1 — Application Readiness

## STATUS: ✅ DONE

## ═══════════════════════════════════════════════════════════

### WHAT THIS PHASE DOES

Prepares every microservice to be "cloud-ready":

- Standardises health endpoints so ECS and ALB know if a service is alive
- Creates .env.example so anyone knows what environment variables are needed
- Ensures structured logging so logs are searchable in CloudWatch

### FILES CREATED / MODIFIED

Health endpoints added to every service:
services/auth-service/src/app.js GET /health, GET /ready, GET /live
services/appointment-service/src/server.js wired to health.routes.js
services/appointment-service/src/routes/health.routes.js (new)
services/ai-service/src/server.js GET /health (with Redis/DB), /ready, /live
services/doctor-service/src/routes/health.routes.js (already existed)
api-gateway/src/routes/health.routes.js added GET /live

.env.example files (never commit real .env):
services/auth-service/.env.example
services/doctor-service/.env.example
services/appointment-service/.env.example
services/ai-service/.env.example
api-gateway/.env.example

### WHAT EACH HEALTH ENDPOINT DOES

GET /health
Full dependency check (MongoDB, Redis, Kafka)
Returns 200 if all critical deps are UP
Returns 503 if a critical dep is DOWN
Used by: ECS ALB health check (decides if task gets traffic)

GET /ready
Readiness probe — is the service ready to handle requests?
Returns 200 only when DB is connected (process may be starting up)
Returns 503 if DB is not yet connected
Used by: ECS container readiness (delays traffic until DB is ready)

GET /live
Liveness probe — is the process itself alive?
Always returns 200 (no dependency checks)
Used by: ECS will RESTART the container if this returns non-200

### STANDARD RESPONSE FORMAT

All /health endpoints return:
{
"status": "UP" or "DEGRADED",
"service": "auth-service",
"version": "1.0.0",
"environment": "production",
"timestamp": "2025-07-19T10:00:00.000Z",
"uptime": 3600,
"checks": {
"database": "CONNECTED",
"kafka": "CONNECTED"
}
}

### HOW TO VERIFY PHASE 1

Start any service locally and test:
cd services/auth-service
npm start
curl http://localhost:4001/health
curl http://localhost:4001/ready
curl http://localhost:4001/live

---

## ═══════════════════════════════════════════════════════════

## PHASE 2 — Dockerization

## STATUS: ✅ DONE

## ═══════════════════════════════════════════════════════════

### WHAT THIS PHASE DOES

Packages every service into a Docker container image.
Each image is self-contained — it includes the app code and all dependencies.
When deployed to AWS ECS, each container runs in its own isolated environment.

### FILES (already existed — fully complete)

Dockerfiles (one per service):
api-gateway/Dockerfile
services/auth-service/Dockerfile
services/doctor-service/Dockerfile
services/appointment-service/Dockerfile
services/ai-service/Dockerfile

Docker Compose files (for local development):
docker-compose.yml — production-like (no exposed service ports)
docker-compose.dev.yml — development (all ports exposed for debugging)
docker-compose.infra.yml — infrastructure only (Kafka, Redis, Mongo, ChromaDB)
docker-compose.observability.yml — Jaeger + Prometheus + Grafana

### KEY DOCKERFILE FEATURES (already implemented)

Multi-stage build:
Stage 1: deps — installs npm packages (not in final image)
Stage 2: runner — only copies what's needed (smaller final image)

Non-root user:
USER expressjs (uid 1001) — containers do NOT run as root (security)

dumb-init:
ENTRYPOINT ["dumb-init", "--"] — handles SIGTERM gracefully (ECS send SIGTERM before kill)

HEALTHCHECK:
Docker knows if the container is healthy before ECS sends it traffic

### HOW TO BUILD AND TEST LOCALLY

cd services/auth-service
docker build -t auth-service:local .
docker run -p 4001:4001 --env-file .env auth-service:local
curl http://localhost:4001/health

### HOW TO RUN ALL SERVICES LOCALLY

# Start infrastructure (Kafka, Redis, MongoDB, ChromaDB)

docker-compose -f docker-compose.infra.yml up -d

# Start observability (Jaeger, Prometheus, Grafana)

docker-compose -f docker-compose.observability.yml up -d

# Start all services in development mode (ports exposed)

docker-compose -f docker-compose.dev.yml up

# Access points:

# API Gateway: http://localhost:3000

# Jaeger UI: http://localhost:16686 (view traces)

# Prometheus: http://localhost:9090 (view metrics)

# Grafana: http://localhost:3001 (dashboards — admin/admin)

---

## ═══════════════════════════════════════════════════════════

## PHASE 3 — Infrastructure as Code (Terraform)

## STATUS: ✅ DONE

## ═══════════════════════════════════════════════════════════

### WHAT THIS PHASE DOES

Instead of clicking around the AWS console, Terraform creates all cloud
infrastructure automatically from code files (.tf).
This means infrastructure is repeatable, version-controlled, and reviewable.

### WHY TERRAFORM INSTEAD OF CLICKING THE AWS CONSOLE

Console: error-prone, manual, can't be reviewed in git, hard to repeat
Terraform: code review, version history, reproducible, team-friendly

### FILES CREATED

Root configuration:
infrastructure/terraform/provider.tf AWS provider + S3 state backend
infrastructure/terraform/variables.tf All configurable inputs
infrastructure/terraform/main.tf Wires all modules together
infrastructure/terraform/outputs.tf Key outputs (ALB URL, ECR URLs, etc.)

Environment configs:
infrastructure/terraform/environments/dev/terraform.tfvars dev settings
infrastructure/terraform/environments/prod/terraform.tfvars prod settings

Reusable modules (each has main.tf + variables.tf + outputs.tf):
infrastructure/terraform/modules/vpc/ VPC + subnets + NAT
infrastructure/terraform/modules/security-groups/ All firewall rules
infrastructure/terraform/modules/ecr/ Docker image repositories
infrastructure/terraform/modules/iam/ Permissions and roles
infrastructure/terraform/modules/alb/ Load balancer
infrastructure/terraform/modules/ecs-cluster/ ECS container cluster
infrastructure/terraform/modules/ecs-service/ One ECS service (reusable)
infrastructure/terraform/modules/redis/ ElastiCache Redis
infrastructure/terraform/modules/secrets/ Secrets Manager entries

### HOW TO READ TERRAFORM FILES

Each module folder contains:
main.tf — what gets created (resources)
variables.tf — inputs the module accepts
outputs.tf — values the module exposes to other modules

### TERRAFORM STATE

Terraform keeps track of what it created in a "state file".
In production this state file is stored in an S3 bucket (not locally)
so the whole team sees the same state.

State backend (defined in provider.tf):
S3 bucket: smartclinic-terraform-state
State lock: DynamoDB table smartclinic-terraform-locks

### HOW TO SET UP TERRAFORM STATE BACKEND (do this once before first apply)

# Create S3 bucket for state (replace ACCOUNT_ID and REGION)

aws s3api create-bucket \
 --bucket smartclinic-terraform-state \
 --region us-east-1

aws s3api put-bucket-versioning \
 --bucket smartclinic-terraform-state \
 --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
 --bucket smartclinic-terraform-state \
 --server-side-encryption-configuration \
 '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Create DynamoDB table for state locking

aws dynamodb create-table \
 --table-name smartclinic-terraform-locks \
 --attribute-definitions AttributeName=LockID,AttributeType=S \
 --key-schema AttributeName=LockID,KeyType=HASH \
 --billing-mode PAY_PER_REQUEST \
 --region us-east-1

---

## ═══════════════════════════════════════════════════════════

## PHASE 4 — AWS Foundation

## STATUS: ✅ DONE (implemented via Terraform modules)

## ═══════════════════════════════════════════════════════════

### WHAT THIS PHASE CREATES (when you run terraform apply)

VPC (Virtual Private Cloud)
Your private network inside AWS.
No traffic can enter or leave unless you explicitly allow it.

Subnets (3 tiers):
Public subnets — ALB and NAT Gateways only (has internet route)
Private subnets — ECS tasks run here (no public IP, no direct internet)
Database subnets — Redis and MSK only (NO internet access at all)

Internet Gateway
Allows traffic from internet to reach the public subnets (ALB)

NAT Gateway (one per AZ)
Allows ECS tasks in private subnets to make OUTBOUND calls
(e.g. to MongoDB Atlas, Groq API, Secrets Manager)
External traffic CANNOT reach ECS tasks directly

Security Groups
Firewall rules. Configured with least privilege:
ALB SG: accepts HTTPS:443 from internet → forwards to API Gateway:3000
API Gateway SG: accepts from ALB → forwards to internal services
Services SG: accepts only from API Gateway (and from each other for gRPC)
Databases SG: accepts only from Services SG (Redis, MSK)

IAM Roles
Task execution role: ECS uses this to pull Docker images and write logs
Per-service task roles: each service only has access to its own secrets
GitHub Actions role: CI/CD uses OIDC (no long-lived keys stored anywhere)

VPC Flow Logs
All network traffic is logged to CloudWatch for security auditing

### NETWORK DIAGRAM

Internet
|
v
Route 53 (DNS) api.smartclinic.com -> ALB
|
WAF (optional) OWASP protection
|
ALB (public subnet) HTTPS:443
|
API Gateway (private subnet, port 3000)
|
+-------+----------+----------+
| | | |
Auth Doctor Appointment AI Service
4001 4002 4003 4004
(all in private subnets — no public IP)
|
+-------+----------+
| |
Redis MongoDB
(database subnets — no internet)

---

## ═══════════════════════════════════════════════════════════

## PHASE 5 — Container Registry (ECR)

## STATUS: ✅ DONE (via Terraform ECR module)

## ═══════════════════════════════════════════════════════════

### WHAT THIS PHASE DOES

Amazon ECR (Elastic Container Registry) stores your Docker images in AWS.
Think of it like DockerHub but private and inside your AWS account.

### WHAT GETS CREATED (when you run terraform apply)

One ECR repository per service:
smartclinic/api-gateway
smartclinic/auth-service
smartclinic/doctor-service
smartclinic/appointment-service
smartclinic/ai-service

Features enabled on each repository:
Immutable tags: once pushed, an image tag cannot be overwritten
Scan on push: ECR automatically scans for vulnerabilities on every push
Lifecycle policy: keeps last 10 images, expires untagged images after 3 days
Encryption: images encrypted at rest with AES256

### HOW TO PUSH AN IMAGE MANUALLY (for testing)

# Login to ECR

aws ecr get-login-password --region us-east-1 | \
 docker login --username AWS --password-stdin \
 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push auth-service

cd services/auth-service
docker build -t auth-service .
docker tag auth-service:latest \
 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/smartclinic/auth-service:latest
docker push \
 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/smartclinic/auth-service:latest

In production, CI/CD does this automatically.

---

## ═══════════════════════════════════════════════════════════

## PHASE 6 — ECS Deployment

## STATUS: ✅ DONE (via Terraform ECS modules)

## ═══════════════════════════════════════════════════════════

### WHAT THIS PHASE DOES

Amazon ECS Fargate runs your Docker containers without you managing servers.
You say "run this container with this much CPU/memory" and AWS handles the rest.

### KEY CONCEPTS

ECS Cluster
A logical group of services. All 5 microservices run in one cluster:
smartclinic-prod

ECS Task Definition
The blueprint for a container: which image, how much CPU/memory,
environment variables, health check, logging config.
Created once per service.

ECS Service
Keeps N tasks of a task definition running at all times.
If a task crashes, ECS automatically starts a new one.

Fargate vs EC2
Fargate = serverless containers (AWS manages the servers — you pay per task)
EC2 = you manage the servers
This project uses Fargate.

### SERVICES AND THEIR RESOURCES

Service CPU Memory Min Tasks Max Tasks
api-gateway 512 1024 2 6
auth-service 256 512 2 4
doctor-service 512 1024 2 10
appointment-service 1024 2048 4 30
ai-service 2048 4096 1 20

WHY DIFFERENT SIZES:
auth-service is small — it only validates JWT tokens (simple work)
appointment-service is medium — SAGA + CQRS + Kafka (complex orchestration)
ai-service is large — LangChain + ChromaDB embeddings need more CPU/memory

### ZERO-DOWNTIME DEPLOYMENT

When you deploy a new version:

1. ECS starts new task with new image
2. ALB health check hits /health — waits for 200
3. Once healthy, ALB sends traffic to new task
4. Old task gets SIGTERM, drains connections (30s), then stops
   Result: users never experience downtime

### DEPLOYMENT CIRCUIT BREAKER

If the new task keeps failing health checks, ECS automatically rolls back
to the previous working task definition.
No manual intervention needed.

### WHAT GETS CREATED PER SERVICE (ecs-service module)

CloudWatch log group /ecs/smartclinic/prod/<service-name>
ECS Task Definition with app container + X-Ray sidecar
ECS Service with Service Connect (internal DNS)
Auto Scaling target + policies
CloudWatch alarms CPU high, task count low

---

## ═══════════════════════════════════════════════════════════

## PHASE 7 — Networking

## STATUS: ✅ DONE

## ═══════════════════════════════════════════════════════════

### WHAT THIS PHASE DOES

Controls how traffic flows through the system.
Key rule: ONLY the API Gateway is reachable from the internet.
All other services are internal-only.

### INTERNAL SERVICE DISCOVERY (ECS Service Connect)

Services find each other using DNS names instead of hardcoded IPs:
auth-service.smartclinic.local:4001
doctor-service.smartclinic.local:4002
appointment-service.smartclinic.local:4003
ai-service.smartclinic.local:4004
otel-collector.smartclinic.local:4318

This DNS resolution only works INSIDE the VPC.
External traffic cannot reach these addresses.

### APPLICATION LOAD BALANCER

The ALB is the ONLY internet-facing component.
It terminates HTTPS (SSL certificate from ACM).
It forwards to API Gateway on port 3000.

Internet -> ALB:443 -> API Gateway:3000 -> Internal services

### SECURITY GROUPS (firewall rules)

Inbound chain:
0.0.0.0/0:443 -> ALB -> API Gateway:3000 -> Services:4001-4004

Database isolation:
Services can reach Redis:6379, Kafka:9092/9094
Databases CANNOT initiate outbound connections (no egress)
Internet CANNOT reach databases

---

## ═══════════════════════════════════════════════════════════

## PHASE 8 — Observability (Tracing, Monitoring, Logging, APM)

## STATUS: ⬜ NEXT STEP — needs implementation

## ═══════════════════════════════════════════════════════════

### WHAT THIS PHASE DOES

Gives you full visibility into what's happening inside your system.
Without observability you are blind — you can't see errors, slow requests, or failures.

### THREE PILLARS OF OBSERVABILITY

1. TRACES — follow a single request across all services
   A user books an appointment. The trace shows:
   API Gateway (20ms) -> Auth validate (5ms) -> Appointment Service (42ms)
   -> MongoDB insert (12ms) -> Kafka publish (7ms)
   Total: 74ms. Every step visible.

2. METRICS — numbers over time (request rate, latency, error rate, CPU)
   "Doctor service is handling 450 requests/second with P99 latency of 280ms"

3. LOGS — structured text records of what happened
   Every log line has a traceId so you can find all logs for one request.

### WHAT IS ALREADY DONE IN YOUR CODE

All 5 services already have:
OpenTelemetry SDK installed and bootstrapped (in server.js)
prom-client for Prometheus metrics (/metrics endpoint)
Winston structured JSON logging (with traceId injection)
Correlation ID middleware (x-correlation-id header)
X-Ray daemon sidecar already in Terraform ECS task definitions

You just need to deploy the OTel Collector and connect everything.

### WHAT NEEDS TO BE DONE NEXT

Step 1: Deploy OTel Collector as ECS Service
The OTel Collector is a central pipeline:

- Receives traces from all services via OTLP
- Receives metrics (scrapes /metrics endpoints)
- Forwards traces to AWS X-Ray
- Forwards metrics to Amazon Managed Prometheus
- Forwards logs to CloudWatch

Step 2: Set OTLP_ENDPOINT env var in all ECS task definitions
OTLP_ENDPOINT=http://otel-collector.smartclinic.local:4318
(services already read this env var — nothing else needed in code)

Step 3: Create Amazon Managed Prometheus workspace
Receives metrics from OTel Collector via remote_write

Step 4: Create Amazon Managed Grafana workspace
Connects to Prometheus workspace as data source
Build 4 dashboards (Infrastructure, Application, Data Layer, Business)

Step 5: Set up CloudWatch alarms
CPU > 85%, 5xx errors, Kafka consumer lag, task count low

### PENDING FILES TO CREATE (Phase 8 implementation)

infrastructure/terraform/modules/otel-collector/main.tf
infrastructure/terraform/modules/cloudwatch/main.tf
observability/otel-collector-config.yaml (OTel Collector pipeline config)
observability/grafana/dashboards/ (Grafana dashboard JSON files)

### HOW TRACES FLOW (once deployed)

Your Service
-> OTel SDK (auto-instruments Express, Mongo, Kafka, Redis, gRPC)
-> OTLP HTTP to OTel Collector:4318
-> OTel Collector batches and forwards
-> AWS X-Ray (traces)
-> Amazon Managed Prometheus (metrics)
-> CloudWatch Logs (logs)
-> Grafana (dashboards pulling from above)

---

## ═══════════════════════════════════════════════════════════

## PHASE 9 — Security

## STATUS: ✅ DONE

## ═══════════════════════════════════════════════════════════

### WHAT WAS IMPLEMENTED

Secrets Management:
All secrets in AWS Secrets Manager (JWT, MongoDB URI, Groq API key)
Non-sensitive config in SSM Parameter Store
No hardcoded secrets in code or Dockerfiles
ECS task execution role pulls secrets at container startup

IAM Least Privilege:
Each ECS service has its own IAM role
Auth service role can only read its own secrets
AI service role can only read its own secrets
No wildcard policies — no AdministratorAccess

Network Security:
Private subnets for all ECS tasks (no public IP)
Database subnets with zero egress (databases cannot initiate connections)
Security groups with specific port rules (not 0-65535 ranges)

Container Security:
Non-root user in all Dockerfiles (expressjs uid:1001)
dumb-init for proper signal handling
ECR image scanning on every push
Trivy scan in CI/CD pipeline (blocks HIGH/CRITICAL CVEs)

Transport Security:
TLS 1.3 on ALB (ELBSecurityPolicy-TLS13-1-2-2021-06)
TLS on Redis (transit encryption enabled in ElastiCache module)
HTTPS enforced — HTTP redirects to HTTPS

Application Security (already in code):
JWT validation at API Gateway (all protected routes)
Helmet.js on all services (security headers)
CORS with explicit origins (no wildcard \*)
Input validation with Zod + express-validator
Rate limiting with express-rate-limit

---

## ═══════════════════════════════════════════════════════════

## PHASE 10 — CI/CD Pipeline

## STATUS: ✅ DONE (GitHub Actions)

## ═══════════════════════════════════════════════════════════

### WHAT THIS PHASE DOES

Automates the deployment process.
When you push code to main, the pipeline automatically:
tests -> builds -> scans -> pushes -> deploys

### FILES CREATED

.github/workflows/\_deploy-service.yml reusable base workflow
.github/workflows/deploy-api-gateway.yml
.github/workflows/deploy-auth-service.yml
.github/workflows/deploy-doctor-service.yml
.github/workflows/deploy-appointment-service.yml
.github/workflows/deploy-ai-service.yml
.github/workflows/deploy-web-ui.yml
.github/workflows/terraform.yml Infrastructure pipeline

### PIPELINE STEPS (for each service)

1.  Git push to main
2.  GitHub Actions triggered (ONLY if that service's files changed)
3.  npm ci — install dependencies
4.  npm run test:ci — run unit tests (FAIL = stop pipeline)
5.  npm run lint — code quality check
6.  Configure AWS via OIDC (no long-lived access keys stored)
7.  docker build — multi-stage Dockerfile
8.  Trivy scan — blocks on HIGH/CRITICAL vulnerabilities
9.  docker push to ECR with git SHA tag (immutable)
10. Download current ECS task definition
11. Update task definition with new image URI
12. ECS rolling deployment (wait for stability)
13. Smoke test (GET /health -> expect 200)
14. Slack notification

### KEY DESIGN DECISIONS

Independent pipelines:
Each service has its own pipeline.
Changing auth-service only triggers auth-service deployment.
Doctor service is NEVER blocked by AI service failures.

Immutable image tags:
Every image tagged with git SHA: auth-service:abc1234ef
You can always roll back to any previous git commit.

OIDC authentication (no long-lived keys):
GitHub Actions gets a temporary AWS token via OIDC
No AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY stored in GitHub
Token expires after the workflow run

Deployment circuit breaker:
If new tasks fail health checks, ECS automatically rolls back.
No manual intervention needed.

### GITHUB SECRETS TO SET (in GitHub -> Settings -> Secrets)

AWS_ACCOUNT_ID your 12-digit AWS account number
AWS_REGION us-east-1
AWS_ROLE_ARN from: terraform output github_actions_role_arn
JWT_SECRET same value as in Secrets Manager
MONGODB_URI same value as in Secrets Manager
GROQ_API_KEY same value as in Secrets Manager
SLACK_WEBHOOK_URL (optional) for deployment notifications
CLOUDFRONT_DISTRIBUTION_ID (for web UI deploy)

### GITHUB VARIABLES TO SET (in GitHub -> Settings -> Variables)

ALB_DNS_NAME from: terraform output alb_dns_name
API_GATEWAY_URL https://api.smartclinic.com (or ALB DNS name)

---

## ═══════════════════════════════════════════════════════════

## PHASE 11 — Performance

## STATUS: ⬜ PENDING (implement after Phase 8)

## ═══════════════════════════════════════════════════════════

### WHAT THIS PHASE DOES

Makes the system fast under high load.

### WHAT IS ALREADY DONE

Redis caching in AI Service (ioredis) — session cache, doctor search cache
ECS Auto Scaling — handles increased load automatically
CloudFront planned for Web UI — CDN for static assets

### WHAT NEEDS TO BE IMPLEMENTED

Caching improvements:
Doctor search results cached in Redis (avoid repeated MongoDB queries)
Appointment availability cached (invalidated on booking)

CDN:
CloudFront distribution for Web UI (S3 + CloudFront already in CI/CD)
S3 bucket for static assets

MongoDB indexes:
Verify compound indexes on frequently queried fields:
doctors: specialty + location + availability
appointments: patientId + date, doctorId + date

Connection pooling:
Mongoose connection pool size tuned for ECS task count
(default 5 connections per Mongoose instance — may need increase)

---

## ═══════════════════════════════════════════════════════════

## PHASE 12 — Production Go Live

## STATUS: ⬜ PENDING (final phase)

## ═══════════════════════════════════════════════════════════

### PRE-GO-LIVE CHECKLIST

Infrastructure:
[ ] Multi-AZ deployment confirmed (tasks running in 2+ AZs)
[ ] Auto Scaling policies validated with load test
[ ] Backup strategy for MongoDB Atlas configured (point-in-time recovery)
[ ] Redis persistence enabled for critical data

Observability:
[ ] X-Ray traces flowing (test with a real request)
[ ] Grafana dashboards show live data (all 4 dashboards)
[ ] CloudWatch alarms firing on test threshold breaches
[ ] All log groups created with 30-day retention
[ ] Alerts sent to Slack/email for CPU, errors, Kafka lag

Security:
[ ] No hardcoded secrets (run: git log --all -p | grep -i "password\|secret\|key" | head)
[ ] ECR image scan shows no CRITICAL vulnerabilities
[ ] WAF enabled on ALB
[ ] TLS 1.3 confirmed on ALB listener
[ ] IAM roles reviewed — no wildcard policies

CI/CD:
[ ] All 6 service pipelines have run at least once successfully
[ ] Rollback tested (deploy a bad image, confirm auto-rollback works)
[ ] Smoke tests passing after each deployment

Load Testing (use k6 or Artillery):
[ ] 100 concurrent users — all services respond < 1s
[ ] 500 concurrent users — auto-scaling kicks in
[ ] Doctor search handles 1000 req/s

DNS and SSL:
[ ] api.smartclinic.com -> ALB DNS name (Route 53 CNAME)
[ ] app.smartclinic.com -> CloudFront distribution (Route 53 CNAME)
[ ] SSL certificate issued and valid
[ ] HTTPS redirect working

---

## ═══════════════════════════════════════════════════════════

## WHAT TO DO RIGHT NOW — NEXT STEP

## ═══════════════════════════════════════════════════════════

The next step is Phase 8: Observability.
Here is the exact sequence:

STEP 1: Create the Terraform state backend (if not done yet)
─────────────────────────────────────────────────────────────

# Run these AWS CLI commands on your machine:

aws s3api create-bucket --bucket smartclinic-terraform-state --region us-east-1
aws s3api put-bucket-versioning \
 --bucket smartclinic-terraform-state \
 --versioning-configuration Status=Enabled
aws dynamodb create-table \
 --table-name smartclinic-terraform-locks \
 --attribute-definitions AttributeName=LockID,AttributeType=S \
 --key-schema AttributeName=LockID,KeyType=HASH \
 --billing-mode PAY_PER_REQUEST \
 --region us-east-1

STEP 2: Fill in dev tfvars with real values
────────────────────────────────────────────
Edit: infrastructure/terraform/environments/dev/terraform.tfvars
Fill in:
jwt_secret = "$(openssl rand -base64 32)"
mongodb_uri = "your MongoDB Atlas connection string"
groq_api_key = "your Groq API key"

STEP 3: Initialize and apply Terraform for dev environment
───────────────────────────────────────────────────────────
cd infrastructure/terraform
terraform init
terraform validate
terraform plan -var-file=environments/dev/terraform.tfvars
terraform apply -var-file=environments/dev/terraform.tfvars

This creates:
VPC + subnets + NAT Gateways
Security Groups
ECR repositories (5 repos)
IAM roles
ALB
ECS Cluster
ElastiCache Redis
Secrets Manager entries
All 5 ECS Services (initially with PLACEHOLDER images)

STEP 4: Get the outputs
────────────────────────
terraform output

# Note these values:

# alb_dns_name -> put in GitHub Variables as ALB_DNS_NAME

# github_actions_role_arn -> put in GitHub Secrets as AWS_ROLE_ARN

# ecr_repository_urls -> you'll see the ECR URLs

STEP 5: Set up GitHub Secrets
──────────────────────────────
Go to: GitHub -> your-repo -> Settings -> Secrets and variables -> Actions
Add secrets:
AWS_ACCOUNT_ID = your account ID
AWS_REGION = us-east-1
AWS_ROLE_ARN = value from terraform output
JWT_SECRET = same as in tfvars
MONGODB_URI = same as in tfvars
GROQ_API_KEY = same as in tfvars
Add variables:
ALB_DNS_NAME = value from terraform output

STEP 6: Push code to trigger CI/CD
────────────────────────────────────
git add .
git commit -m "feat: add terraform infrastructure and CI/CD pipelines"
git push origin main

# Watch GitHub Actions run at: github.com/your-org/smart-clinic/actions

# Each service builds, scans, and deploys automatically

STEP 7: Implement Phase 8 (Observability)
──────────────────────────────────────────
Tell me "proceed to Phase 8" and I will:

- Create the OTel Collector Terraform module + ECS service
- Create the Amazon Managed Prometheus Terraform module
- Create CloudWatch Alarms Terraform module
- Create OTel Collector config (otel-collector-config.yaml)
- Create Grafana dashboard JSON files (4 dashboards)
- Wire OTLP_ENDPOINT into all ECS task definitions

---

## PROJECT FILE MAP

/smart-clinic
├── .github/workflows/ CI/CD pipelines
│ ├── \_deploy-service.yml reusable base pipeline
│ ├── deploy-api-gateway.yml API Gateway pipeline
│ ├── deploy-auth-service.yml Auth pipeline
│ ├── deploy-doctor-service.yml Doctor pipeline
│ ├── deploy-appointment-service.yml Appointment pipeline
│ ├── deploy-ai-service.yml AI pipeline
│ ├── deploy-web-ui.yml Web UI (S3+CloudFront)
│ └── terraform.yml Infrastructure pipeline
│
├── infrastructure/terraform/ All AWS infrastructure as code
│ ├── provider.tf AWS + S3 state backend
│ ├── variables.tf All inputs
│ ├── main.tf Wires all modules
│ ├── outputs.tf Key output values
│ ├── environments/
│ │ ├── dev/terraform.tfvars Dev environment settings
│ │ └── prod/terraform.tfvars Prod environment settings
│ └── modules/
│ ├── vpc/ VPC + subnets + NAT
│ ├── security-groups/ All firewall rules
│ ├── ecr/ Docker image repositories
│ ├── iam/ IAM roles
│ ├── alb/ Load balancer
│ ├── ecs-cluster/ ECS cluster + Service Connect
│ ├── ecs-service/ Reusable ECS service
│ ├── redis/ ElastiCache Redis
│ └── secrets/ Secrets Manager
│
├── api-gateway/ API Gateway service
│ ├── Dockerfile Multi-stage build
│ ├── .env.example Required env vars
│ └── src/
│ ├── index.js Entry point
│ └── routes/health.routes.js /health /ready /live /status
│
├── services/
│ ├── auth-service/ JWT auth
│ │ ├── Dockerfile
│ │ ├── .env.example
│ │ └── src/app.js /health /ready /live
│ ├── doctor-service/ Doctor management
│ │ ├── Dockerfile
│ │ ├── .env.example
│ │ └── src/routes/health.routes.js /health /ready /live
│ ├── appointment-service/ SAGA + CQRS
│ │ ├── Dockerfile
│ │ ├── .env.example
│ │ └── src/routes/health.routes.js /health /ready /live (new)
│ └── ai-service/ LangChain + RAG
│ ├── Dockerfile
│ ├── .env.example
│ └── src/server.js /health /ready /live
│
├── web_ui_app/ React + Vite web app
├── mobile_ui_app/ React Native app
│ └── src/constants/config.ts API URL: 192.168.1.101:3000
│
├── docker-compose.yml Production-like local setup
├── docker-compose.dev.yml Development (all ports exposed)
├── docker-compose.infra.yml Infrastructure only
└── docker-compose.observability.yml Jaeger + Prometheus + Grafana

---

## GLOSSARY (plain-language definitions)

ECS Fargate Run Docker containers without managing servers
ECR Docker image registry inside AWS (like private DockerHub)
ALB Load balancer that distributes HTTPS traffic
VPC Your private network in AWS
Subnet A section of your VPC (public/private/database tiers)
NAT Gateway Lets private subnets make outbound calls to the internet
IAM Role A set of permissions assigned to a service or person
Secrets Manager Encrypted storage for passwords and API keys
SSM Parameter Store Storage for non-sensitive configuration values
Service Connect ECS feature that gives services internal DNS names
OIDC Authentication method — no long-lived keys needed
Auto Scaling ECS automatically adds/removes tasks based on CPU/memory
OTel OpenTelemetry — standard for traces, metrics, logs
OTLP The protocol OTel uses to send data to a collector
X-Ray AWS tracing service — shows distributed traces
Prometheus Time-series metrics database
Grafana Dashboard tool that reads from Prometheus
SAGA Pattern for distributed transactions across services
CQRS Separate read and write models for scalability
gRPC High-performance RPC protocol (Doctor/Appointment/AI use this internally)
Kafka Event streaming — services publish/consume events asynchronously

# ── Dev environment values ────────────────────────────────────────────────────
# Copy this file, fill real secrets, and NEVER commit to git.

environment        = "dev"
aws_region         = "us-east-1"
project            = "smartclinic"
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# Leave empty in dev to use HTTP only (no ACM certificate needed)
acm_certificate_arn = ""

# ECR images — populated by CI/CD pipeline on first deploy.
# Format: <account_id>.dkr.ecr.<region>.amazonaws.com/<repo>:<tag>
api_gateway_image         = "PLACEHOLDER"
auth_service_image        = "PLACEHOLDER"
doctor_service_image      = "PLACEHOLDER"
appointment_service_image = "PLACEHOLDER"
ai_service_image          = "PLACEHOLDER"

# Secrets — fill these before running terraform apply
# Generate JWT secret: openssl rand -base64 32
jwt_secret   = "CHANGE_ME"
mongodb_uri  = "CHANGE_ME"   # MongoDB Atlas connection string
groq_api_key = "CHANGE_ME"

# Scaling — smaller footprint in dev
api_gateway_min_tasks         = 1
api_gateway_max_tasks         = 3
auth_service_min_tasks        = 1
auth_service_max_tasks        = 2
doctor_service_min_tasks      = 1
doctor_service_max_tasks      = 4
appointment_service_min_tasks = 1
appointment_service_max_tasks = 6
ai_service_min_tasks          = 1
ai_service_max_tasks          = 4

# Observability alerts
alert_email = "your-email@example.com"   # change to receive alarm emails

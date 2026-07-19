# ── Production environment values ─────────────────────────────────────────────
# NEVER commit real secrets. Use -var-file in CI/CD with secrets from GitHub.

environment        = "prod"
aws_region         = "us-east-1"
project            = "smartclinic"
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# ACM certificate for HTTPS (must be issued in us-east-1 for ALB)
acm_certificate_arn = "arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID"

# ECR images — populated by CI/CD
api_gateway_image         = "PLACEHOLDER"
auth_service_image        = "PLACEHOLDER"
doctor_service_image      = "PLACEHOLDER"
appointment_service_image = "PLACEHOLDER"
ai_service_image          = "PLACEHOLDER"

# Secrets — injected by CI/CD from GitHub Actions secrets
jwt_secret   = "INJECTED_BY_CICD"
mongodb_uri  = "INJECTED_BY_CICD"
groq_api_key = "INJECTED_BY_CICD"

# Production scaling
api_gateway_min_tasks         = 2
api_gateway_max_tasks         = 6
auth_service_min_tasks        = 2
auth_service_max_tasks        = 4
doctor_service_min_tasks      = 2
doctor_service_max_tasks      = 10
appointment_service_min_tasks = 4
appointment_service_max_tasks = 30
ai_service_min_tasks          = 1
ai_service_max_tasks          = 20

# Observability alerts
alert_email = "oncall@smartclinic.com"   # change to your on-call email

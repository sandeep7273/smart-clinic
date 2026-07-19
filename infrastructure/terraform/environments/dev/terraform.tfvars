# Dev environment — auto-generated 2026-07-19
# DO NOT commit this file — it contains real secrets

environment        = "dev"
aws_region         = "us-east-1"
project            = "smartclinic"
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]
acm_certificate_arn = ""   # HTTP only for dev — add ACM cert ARN for HTTPS

# ECR images — CI/CD pipeline fills these in after first terraform apply
api_gateway_image         = "791732163161.dkr.ecr.us-east-1.amazonaws.com/smartclinic/api-gateway:latest"
auth_service_image        = "791732163161.dkr.ecr.us-east-1.amazonaws.com/smartclinic/auth-service:latest"
doctor_service_image      = "791732163161.dkr.ecr.us-east-1.amazonaws.com/smartclinic/doctor-service:latest"
appointment_service_image = "791732163161.dkr.ecr.us-east-1.amazonaws.com/smartclinic/appointment-service:latest"
ai_service_image          = "791732163161.dkr.ecr.us-east-1.amazonaws.com/smartclinic/ai-service:latest"

# Secrets
jwt_secret   = "GrMaEauo5CzjmcvYXenRh1gV3WXtwiofq3/KahphmFQ="
groq_api_key = "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"

# MongoDB Atlas URIs — one per service (same cluster, different databases)
mongodb_uris = {
  "auth-service"        = "mongodb+srv://sandiipkd_db_user:DSmCA0vOYaOSG0Al@cluster0.lr0lbks.mongodb.net/auth_db?appName=Cluster0"
  "doctor-service"      = "mongodb+srv://sandiipkd_db_user:DSmCA0vOYaOSG0Al@cluster0.lr0lbks.mongodb.net/doctor_db?appName=Cluster0"
  "appointment-service" = "mongodb+srv://sandiipkd_db_user:DSmCA0vOYaOSG0Al@cluster0.lr0lbks.mongodb.net/appointment_service?appName=Cluster0"
  "ai-service"          = "mongodb+srv://sandiipkd_db_user:DSmCA0vOYaOSG0Al@cluster0.lr0lbks.mongodb.net/ai_db?appName=Cluster0"
}

# Scaling — minimal for dev (saves cost)
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
alert_email = ""   # add your email to receive CloudWatch alarms

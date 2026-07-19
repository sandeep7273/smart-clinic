###############################################################################
# Smart Clinic — Root Terraform Configuration
# Wires all modules together for a given environment.
#
# Usage:
#   terraform -chdir=infrastructure/terraform init
#   terraform -chdir=infrastructure/terraform plan  -var-file=environments/dev/terraform.tfvars
#   terraform -chdir=infrastructure/terraform apply -var-file=environments/dev/terraform.tfvars
###############################################################################

data "aws_caller_identity" "current" {}

# ── 1. VPC ────────────────────────────────────────────────────────────────────
module "vpc" {
  source             = "./modules/vpc"
  project            = var.project
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# ── 2. Security Groups ────────────────────────────────────────────────────────
module "security_groups" {
  source      = "./modules/security-groups"
  project     = var.project
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

# ── 3. ECR Repositories ───────────────────────────────────────────────────────
module "ecr" {
  source      = "./modules/ecr"
  project     = var.project
  environment = var.environment
}

# ── 4. IAM Roles ─────────────────────────────────────────────────────────────
module "iam" {
  source      = "./modules/iam"
  project     = var.project
  environment = var.environment
}

# ── 5. Secrets Manager ────────────────────────────────────────────────────────
module "secrets" {
  source                = "./modules/secrets"
  project               = var.project
  environment           = var.environment
  jwt_secret            = var.jwt_secret
  jwt_refresh_secret    = var.jwt_secret   # use separate value in prod
  mongodb_uri           = var.mongodb_uri
  groq_api_key          = var.groq_api_key
  internal_service_token = random_password.internal_token.result

  ssm_parameters = {
    "KAFKA_BROKERS"             = "localhost:9092"   # replace with MSK endpoint after creation
    "LOG_LEVEL"                 = "info"
    "OTLP_ENDPOINT"             = "http://otel-collector.${var.project}.local:4318"
    "AUTH_SERVICE_URL"          = "http://auth-service.${var.project}.local:4001"
    "DOCTOR_SERVICE_URL"        = "http://doctor-service.${var.project}.local:4002"
    "APPOINTMENT_SERVICE_URL"   = "http://appointment-service.${var.project}.local:4003"
    "AI_SERVICE_URL"            = "http://ai-service.${var.project}.local:4004"
  }
}

resource "random_password" "internal_token" {
  length  = 64
  special = false
}

# ── 6. ALB ────────────────────────────────────────────────────────────────────
module "alb" {
  source              = "./modules/alb"
  project             = var.project
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  alb_sg_id           = module.security_groups.alb_sg_id
  acm_certificate_arn = var.acm_certificate_arn
  account_id          = data.aws_caller_identity.current.account_id
}

# ── 7. Redis ──────────────────────────────────────────────────────────────────
module "redis" {
  source             = "./modules/redis"
  project            = var.project
  environment        = var.environment
  database_subnet_ids= module.vpc.database_subnet_ids
  databases_sg_id    = module.security_groups.databases_sg_id
  node_type          = var.environment == "prod" ? "cache.r7g.large" : "cache.t4g.micro"
}

# ── 8. ECS Cluster ────────────────────────────────────────────────────────────
module "ecs_cluster" {
  source      = "./modules/ecs-cluster"
  project     = var.project
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
}

# ── Phase 8: Observability ────────────────────────────────────────────────────

# 8a. Amazon Managed Prometheus (metrics store)
module "prometheus" {
  source        = "./modules/prometheus"
  project       = var.project
  environment   = var.environment
  aws_region    = var.aws_region
  sns_topic_arn = aws_sns_topic.alerts.arn
}

# 8b. OTel Collector (ECS Service — central pipeline)
module "otel_collector" {
  source                  = "./modules/otel-collector"
  project                 = var.project
  environment             = var.environment
  cluster_id              = module.ecs_cluster.cluster_id
  namespace_arn           = module.ecs_cluster.namespace_arn
  private_subnet_ids      = module.vpc.private_subnet_ids
  otel_collector_sg_id    = module.security_groups.otel_collector_sg_id
  task_execution_role_arn = module.iam.task_execution_role_arn
  amp_workspace_arn       = module.prometheus.workspace_arn
  amp_remote_write_url    = module.prometheus.remote_write_url
}

# 8c. CloudWatch alarms + log groups + dashboard
module "cloudwatch" {
  source           = "./modules/cloudwatch"
  project          = var.project
  environment      = var.environment
  cluster_name     = module.ecs_cluster.cluster_name
  alb_arn_suffix   = split("/", module.alb.alb_arn)[3]
  sns_topic_arn    = aws_sns_topic.alerts.arn
  redis_cluster_id = "${var.project}-${var.environment}-redis"
  alert_email      = var.alert_email
}

# ── SNS Alert Topic ────────────────────────────────────────────────────────────
resource "aws_sns_topic" "alerts" {
  name = "${var.project}-${var.environment}-alerts"
}

# ── 9. ECS Services (one per microservice) ────────────────────────────────────

# ── API Gateway ───────────────────────────────────────────────────────────────
module "api_gateway_service" {
  source                  = "./modules/ecs-service"
  project                 = var.project
  environment             = var.environment
  service_name            = "api-gateway"
  image_uri               = var.api_gateway_image
  cluster_id              = module.ecs_cluster.cluster_id
  cluster_name            = module.ecs_cluster.cluster_name
  namespace_arn           = module.ecs_cluster.namespace_arn
  task_execution_role_arn = module.iam.task_execution_role_arn
  task_role_arn           = module.iam.task_role_arns["api-gateway"]
  private_subnet_ids      = module.vpc.private_subnet_ids
  security_group_ids      = [module.security_groups.api_gateway_sg_id]
  container_port          = 3000
  cpu                     = 512
  memory                  = 1024
  min_tasks               = var.api_gateway_min_tasks
  max_tasks               = var.api_gateway_max_tasks
  desired_count           = var.api_gateway_min_tasks
  target_group_arn        = module.alb.api_gateway_target_group_arn
  alarm_sns_topic_arn     = aws_sns_topic.alerts.arn

  environment_vars = [
    { name = "NODE_ENV",        value = "production" },
    { name = "PORT",            value = "3000" },
    { name = "SERVICE_NAME",    value = "api-gateway" },
    { name = "SERVICE_VERSION", value = "1.0.0" },
    { name = "OTLP_ENDPOINT",   value = module.otel_collector.otel_collector_endpoint },
    { name = "LOG_LEVEL",       value = "info" },
  ]

  secrets = [
    { name = "JWT_SECRET",             valueFrom = module.secrets.jwt_secret_arn },
    { name = "INTERNAL_SERVICE_TOKEN", valueFrom = module.secrets.internal_token_arn },
  ]
}

# ── Auth Service ──────────────────────────────────────────────────────────────
module "auth_service" {
  source                  = "./modules/ecs-service"
  project                 = var.project
  environment             = var.environment
  service_name            = "auth-service"
  image_uri               = var.auth_service_image
  cluster_id              = module.ecs_cluster.cluster_id
  cluster_name            = module.ecs_cluster.cluster_name
  namespace_arn           = module.ecs_cluster.namespace_arn
  task_execution_role_arn = module.iam.task_execution_role_arn
  task_role_arn           = module.iam.task_role_arns["auth-service"]
  private_subnet_ids      = module.vpc.private_subnet_ids
  security_group_ids      = [module.security_groups.services_sg_id]
  container_port          = 4001
  cpu                     = 256
  memory                  = 512
  min_tasks               = var.auth_service_min_tasks
  max_tasks               = var.auth_service_max_tasks
  desired_count           = var.auth_service_min_tasks
  alarm_sns_topic_arn     = aws_sns_topic.alerts.arn

  environment_vars = [
    { name = "NODE_ENV",        value = "production" },
    { name = "PORT",            value = "4001" },
    { name = "SERVICE_NAME",    value = "auth-service" },
    { name = "SERVICE_VERSION", value = "1.0.0" },
    { name = "OTLP_ENDPOINT",   value = module.otel_collector.otel_collector_endpoint },
    { name = "LOG_LEVEL",       value = "info" },
  ]

  secrets = [
    { name = "MONGODB_URI",        valueFrom = module.secrets.mongodb_uri_arns["auth-service"] },
    { name = "JWT_SECRET",         valueFrom = module.secrets.jwt_secret_arn },
    { name = "JWT_REFRESH_SECRET", valueFrom = module.secrets.jwt_refresh_secret_arn },
  ]
}

# ── Doctor Service ────────────────────────────────────────────────────────────
module "doctor_service" {
  source                  = "./modules/ecs-service"
  project                 = var.project
  environment             = var.environment
  service_name            = "doctor-service"
  image_uri               = var.doctor_service_image
  cluster_id              = module.ecs_cluster.cluster_id
  cluster_name            = module.ecs_cluster.cluster_name
  namespace_arn           = module.ecs_cluster.namespace_arn
  task_execution_role_arn = module.iam.task_execution_role_arn
  task_role_arn           = module.iam.task_role_arns["doctor-service"]
  private_subnet_ids      = module.vpc.private_subnet_ids
  security_group_ids      = [module.security_groups.services_sg_id]
  container_port          = 4002
  cpu                     = 512
  memory                  = 1024
  min_tasks               = var.doctor_service_min_tasks
  max_tasks               = var.doctor_service_max_tasks
  desired_count           = var.doctor_service_min_tasks
  alarm_sns_topic_arn     = aws_sns_topic.alerts.arn

  environment_vars = [
    { name = "NODE_ENV",        value = "production" },
    { name = "PORT",            value = "4002" },
    { name = "GRPC_PORT",       value = "50051" },
    { name = "SERVICE_NAME",    value = "doctor-service" },
    { name = "SERVICE_VERSION", value = "1.0.0" },
    { name = "OTLP_ENDPOINT",   value = module.otel_collector.otel_collector_endpoint },
    { name = "LOG_LEVEL",       value = "info" },
  ]

  secrets = [
    { name = "MONGODB_URI", valueFrom = module.secrets.mongodb_uri_arns["doctor-service"] },
  ]
}

# ── Appointment Service ───────────────────────────────────────────────────────
module "appointment_service" {
  source                  = "./modules/ecs-service"
  project                 = var.project
  environment             = var.environment
  service_name            = "appointment-service"
  image_uri               = var.appointment_service_image
  cluster_id              = module.ecs_cluster.cluster_id
  cluster_name            = module.ecs_cluster.cluster_name
  namespace_arn           = module.ecs_cluster.namespace_arn
  task_execution_role_arn = module.iam.task_execution_role_arn
  task_role_arn           = module.iam.task_role_arns["appointment-service"]
  private_subnet_ids      = module.vpc.private_subnet_ids
  security_group_ids      = [module.security_groups.services_sg_id]
  container_port          = 4003
  cpu                     = 1024
  memory                  = 2048
  min_tasks               = var.appointment_service_min_tasks
  max_tasks               = var.appointment_service_max_tasks
  desired_count           = var.appointment_service_min_tasks
  alarm_sns_topic_arn     = aws_sns_topic.alerts.arn

  environment_vars = [
    { name = "NODE_ENV",        value = "production" },
    { name = "PORT",            value = "4003" },
    { name = "GRPC_PORT",       value = "50052" },
    { name = "SERVICE_NAME",    value = "appointment-service" },
    { name = "SERVICE_VERSION", value = "1.0.0" },
    { name = "OTLP_ENDPOINT",   value = module.otel_collector.otel_collector_endpoint },
    { name = "LOG_LEVEL",       value = "info" },
    { name = "DOCTOR_GRPC_URL", value = "doctor-service.${var.project}.local:50051" },
  ]

  secrets = [
    { name = "MONGODB_URI", valueFrom = module.secrets.mongodb_uri_arns["appointment-service"] },
  ]
}

# ── AI Service ────────────────────────────────────────────────────────────────
module "ai_service" {
  source                  = "./modules/ecs-service"
  project                 = var.project
  environment             = var.environment
  service_name            = "ai-service"
  image_uri               = var.ai_service_image
  cluster_id              = module.ecs_cluster.cluster_id
  cluster_name            = module.ecs_cluster.cluster_name
  namespace_arn           = module.ecs_cluster.namespace_arn
  task_execution_role_arn = module.iam.task_execution_role_arn
  task_role_arn           = module.iam.task_role_arns["ai-service"]
  private_subnet_ids      = module.vpc.private_subnet_ids
  security_group_ids      = [module.security_groups.services_sg_id]
  container_port          = 4004
  cpu                     = 2048
  memory                  = 4096
  min_tasks               = var.ai_service_min_tasks
  max_tasks               = var.ai_service_max_tasks
  desired_count           = var.ai_service_min_tasks
  cpu_target_percent      = 70
  memory_target_percent   = 80
  alarm_sns_topic_arn     = aws_sns_topic.alerts.arn

  environment_vars = [
    { name = "NODE_ENV",                        value = "production" },
    { name = "PORT",                            value = "4004" },
    { name = "GRPC_PORT",                       value = "50053" },
    { name = "SERVICE_NAME",                    value = "ai-service" },
    { name = "REDIS_HOST",                      value = module.redis.redis_endpoint },
    { name = "REDIS_PORT",                      value = tostring(module.redis.redis_port) },
    { name = "DOCTOR_SERVICE_GRPC_HOST",        value = "doctor-service.${var.project}.local" },
    { name = "DOCTOR_SERVICE_GRPC_PORT",        value = "50051" },
    { name = "APPOINTMENT_SERVICE_GRPC_HOST",   value = "appointment-service.${var.project}.local" },
    { name = "APPOINTMENT_SERVICE_GRPC_PORT",   value = "50052" },
    { name = "SERVICE_VERSION",                 value = "1.0.0" },
    { name = "OTLP_ENDPOINT",                   value = module.otel_collector.otel_collector_endpoint },
    { name = "LOG_LEVEL",                       value = "info" },
  ]

  secrets = [
    { name = "MONGODB_URI",  valueFrom = module.secrets.mongodb_uri_arns["ai-service"] },
    { name = "GROQ_API_KEY", valueFrom = module.secrets.groq_api_key_arn },
  ]
}

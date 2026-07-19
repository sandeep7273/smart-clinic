###############################################################################
# OTel Collector Module
#
# Deploys OpenTelemetry Collector as an ECS Fargate service.
# It is the central observability pipeline for the entire system:
#
#   All 5 services
#       |-- OTLP HTTP :4318 --> OTel Collector --> AWS X-Ray     (traces)
#       |-- OTLP HTTP :4318 --> OTel Collector --> AMP           (metrics)
#       |-- /metrics scrape --> OTel Collector --> AMP           (metrics)
#                              OTel Collector --> CloudWatch Logs (logs)
###############################################################################

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

locals {
  name = "${var.project}-${var.environment}-otel-collector"
}

# ── S3 bucket for OTel Collector config file ──────────────────────────────────
resource "aws_s3_bucket" "otel_config" {
  bucket        = "${var.project}-${var.environment}-otel-config-${data.aws_caller_identity.current.account_id}-${var.region_short}"
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "otel_config" {
  bucket = aws_s3_bucket.otel_config.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_object" "otel_config" {
  bucket = aws_s3_bucket.otel_config.bucket
  key    = "otel-collector-config.yaml"
  source = "${path.module}/../../../../observability/otel-collector-config.yaml"
  etag   = filemd5("${path.module}/../../../../observability/otel-collector-config.yaml")
}

# ── CloudWatch log group for OTel Collector itself ────────────────────────────
resource "aws_cloudwatch_log_group" "otel" {
  name              = "/ecs/${var.project}/${var.environment}/otel-collector"
  retention_in_days = 14
}

# ── IAM role for OTel Collector task ─────────────────────────────────────────
resource "aws_iam_role" "otel_task_role" {
  name = "${local.name}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "otel_task_policy" {
  name = "otel-collector-policy"
  role = aws_iam_role.otel_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # X-Ray: write traces
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries"
        ]
        Resource = "*"
      },
      # Amazon Managed Prometheus: write metrics
      {
        Effect   = "Allow"
        Action   = ["aps:RemoteWrite", "aps:GetSeries", "aps:GetLabels"]
        Resource = var.amp_workspace_arn != "" ? var.amp_workspace_arn : "*"
      },
      # CloudWatch: write logs and metrics
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      },
      # S3: read config file
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.otel_config.arn}/*"
      }
    ]
  })
}

# ── ECS Task Definition ───────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "otel" {
  family                   = local.name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = aws_iam_role.otel_task_role.arn

  container_definitions = jsonencode([{
    name      = "otel-collector"
    image     = "otel/opentelemetry-collector-contrib:0.99.0"
    essential = true

    command = ["--config=env:OTEL_CONFIG"]

    # Port mappings
    portMappings = [
      { name = "otlp-grpc", containerPort = 4317, protocol = "tcp" },
      { name = "otlp-http", containerPort = 4318, protocol = "tcp" },
      { name = "health", containerPort = 13133, protocol = "tcp" }
    ]

    environment = [
      { name = "AWS_REGION", value = data.aws_region.current.name },
      { name = "AMP_ENDPOINT", value = var.amp_remote_write_url },
      { name = "SERVICE_NAMESPACE", value = "${var.project}.local" },
      # Service addresses for Prometheus scrape
      { name = "API_GATEWAY_ADDR", value = "api-gateway.${var.project}.local:3000" },
      { name = "AUTH_SERVICE_ADDR", value = "auth-service.${var.project}.local:4001" },
      { name = "DOCTOR_SERVICE_ADDR", value = "doctor-service.${var.project}.local:4002" },
      { name = "APPOINTMENT_SERVICE_ADDR", value = "appointment-service.${var.project}.local:4003" },
      { name = "AI_SERVICE_ADDR", value = "ai-service.${var.project}.local:4004" },
    ]

    secrets = [{
      name      = "OTEL_CONFIG"
      valueFrom = aws_ssm_parameter.otel_config_ssm.arn
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.otel.name
        "awslogs-region"        = data.aws_region.current.name
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD", "/healthcheck"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }
  }])
}

# Store config in SSM Parameter (Collector reads via env var OTEL_CONFIG)
resource "aws_ssm_parameter" "otel_config_ssm" {
  name  = "/${var.project}/${var.environment}/otel-collector/config"
  type  = "String"
  tier  = "Advanced"
  value = file("${path.module}/../../../../observability/otel-collector-config.yaml")

  lifecycle {
    ignore_changes = [value]
  }
}

# ── ECS Service ───────────────────────────────────────────────────────────────
resource "aws_ecs_service" "otel" {
  name            = "otel-collector"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.otel.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.otel_collector_sg_id]
    assign_public_ip = false
  }

  service_connect_configuration {
    enabled   = true
    namespace = var.namespace_arn

    service {
      port_name      = "otlp-http"
      discovery_name = "otel-collector"
      client_alias {
        port     = 4318
        dns_name = "otel-collector.${var.project}.local"
      }
    }
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
}

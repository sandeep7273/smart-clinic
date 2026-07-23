###############################################################################
# Security Groups Module
# Groups are created first (empty), then rules added separately.
# This breaks the circular-reference cycle.
###############################################################################

# ── Create groups (no inline rules) ──────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${var.project}-${var.environment}-alb-sg"
  description = "ALB: accepts HTTPS from internet, forwards to API Gateway"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-${var.environment}-alb-sg" }
}

resource "aws_security_group" "api_gateway" {
  name        = "${var.project}-${var.environment}-api-gateway-sg"
  description = "API Gateway ECS tasks"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-${var.environment}-api-gateway-sg" }
}

resource "aws_security_group" "services" {
  name        = "${var.project}-${var.environment}-services-sg"
  description = "Internal ECS services: auth, doctor, appointment, ai"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-${var.environment}-services-sg" }
}

resource "aws_security_group" "databases" {
  name        = "${var.project}-${var.environment}-databases-sg"
  description = "Databases: Redis, MSK - reachable only from ECS services"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-${var.environment}-databases-sg" }
}

resource "aws_security_group" "otel_collector" {
  name        = "${var.project}-${var.environment}-otel-collector-sg"
  description = "OTel Collector: receives traces/metrics from all ECS services"
  vpc_id      = var.vpc_id
  tags        = { Name = "${var.project}-${var.environment}-otel-collector-sg" }
}

# ── ALB rules ─────────────────────────────────────────────────────────────────
resource "aws_security_group_rule" "alb_in_https" {
  type              = "ingress"
  security_group_id = aws_security_group.alb.id
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "HTTPS from internet"
}

resource "aws_security_group_rule" "alb_in_http" {
  type              = "ingress"
  security_group_id = aws_security_group.alb.id
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "HTTP (redirect to HTTPS)"
}

resource "aws_security_group_rule" "alb_in_dev_http_alt" {
  count             = var.environment == "prod" ? 0 : 1
  type              = "ingress"
  security_group_id = aws_security_group.alb.id
  from_port         = 8080
  to_port           = 8080
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Dev HTTP alternate listener"
}

resource "aws_security_group_rule" "alb_out_api_gw" {
  type                     = "egress"
  security_group_id        = aws_security_group.alb.id
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.api_gateway.id
  description              = "To API Gateway"
}

# ── API Gateway rules ─────────────────────────────────────────────────────────
resource "aws_security_group_rule" "api_gw_in_alb" {
  type                     = "ingress"
  security_group_id        = aws_security_group.api_gateway.id
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
  description              = "From ALB"
}

resource "aws_security_group_rule" "api_gw_out_services" {
  type                     = "egress"
  security_group_id        = aws_security_group.api_gateway.id
  from_port                = 4001
  to_port                  = 4004
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.services.id
  description              = "To internal services (REST)"
}

resource "aws_security_group_rule" "api_gw_out_grpc" {
  type                     = "egress"
  security_group_id        = aws_security_group.api_gateway.id
  from_port                = 50051
  to_port                  = 50053
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.services.id
  description              = "To internal services (gRPC)"
}

resource "aws_security_group_rule" "api_gw_out_https" {
  type              = "egress"
  security_group_id = aws_security_group.api_gateway.id
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Outbound HTTPS (Secrets Manager, ECR, Groq API)"
}

resource "aws_security_group_rule" "api_gw_out_otel" {
  type                     = "egress"
  security_group_id        = aws_security_group.api_gateway.id
  from_port                = 4318
  to_port                  = 4318
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.otel_collector.id
  description              = "OTLP to OTel Collector"
}

# ── Internal Services rules ───────────────────────────────────────────────────
resource "aws_security_group_rule" "services_in_api_gw" {
  type                     = "ingress"
  security_group_id        = aws_security_group.services.id
  from_port                = 4001
  to_port                  = 4004
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.api_gateway.id
  description              = "REST from API Gateway"
}

resource "aws_security_group_rule" "services_in_grpc_self" {
  type              = "ingress"
  security_group_id = aws_security_group.services.id
  from_port         = 50051
  to_port           = 50053
  protocol          = "tcp"
  self              = true
  description       = "gRPC inter-service calls"
}

resource "aws_security_group_rule" "services_in_grpc_api_gw" {
  type                     = "ingress"
  security_group_id        = aws_security_group.services.id
  from_port                = 50051
  to_port                  = 50053
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.api_gateway.id
  description              = "gRPC from API Gateway to AI service"
}

resource "aws_security_group_rule" "services_out_grpc_self" {
  type              = "egress"
  security_group_id = aws_security_group.services.id
  from_port         = 50051
  to_port           = 50053
  protocol          = "tcp"
  self              = true
  description       = "gRPC inter-service calls"
}

resource "aws_security_group_rule" "services_out_databases" {
  type                     = "egress"
  security_group_id        = aws_security_group.services.id
  from_port                = 0
  to_port                  = 0
  protocol                 = "-1"
  source_security_group_id = aws_security_group.databases.id
  description              = "To database tier"
}

resource "aws_security_group_rule" "services_out_https" {
  type              = "egress"
  security_group_id = aws_security_group.services.id
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "Outbound HTTPS (ECR, Secrets Manager, Groq)"
}

# MongoDB Atlas uses port 27017 (NOT 443) — required for all services that connect to Atlas
resource "aws_security_group_rule" "services_out_mongodb" {
  type              = "egress"
  security_group_id = aws_security_group.services.id
  from_port         = 27015
  to_port           = 27017
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "MongoDB Atlas (ports 27015-27017)"
}

resource "aws_security_group_rule" "services_out_otel" {
  type                     = "egress"
  security_group_id        = aws_security_group.services.id
  from_port                = 4318
  to_port                  = 4318
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.otel_collector.id
  description              = "OTLP to OTel Collector"
}

# ── Database rules ────────────────────────────────────────────────────────────
resource "aws_security_group_rule" "db_in_redis" {
  type                     = "ingress"
  security_group_id        = aws_security_group.databases.id
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.services.id
  description              = "Redis from ECS services"
}

resource "aws_security_group_rule" "db_in_kafka_plain" {
  type                     = "ingress"
  security_group_id        = aws_security_group.databases.id
  from_port                = 9092
  to_port                  = 9092
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.services.id
  description              = "Kafka plaintext from ECS services"
}

resource "aws_security_group_rule" "db_in_kafka_tls" {
  type                     = "ingress"
  security_group_id        = aws_security_group.databases.id
  from_port                = 9094
  to_port                  = 9094
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.services.id
  description              = "Kafka TLS from ECS services"
}

# ── OTel Collector rules ──────────────────────────────────────────────────────
resource "aws_security_group_rule" "otel_in_http" {
  type              = "ingress"
  security_group_id = aws_security_group.otel_collector.id
  from_port         = 4318
  to_port           = 4318
  protocol          = "tcp"
  self              = true
  description       = "OTLP HTTP from all services (self-ref via combined SG)"
}

resource "aws_security_group_rule" "otel_in_http_services" {
  type                     = "ingress"
  security_group_id        = aws_security_group.otel_collector.id
  from_port                = 4318
  to_port                  = 4318
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.services.id
  description              = "OTLP HTTP from services"
}

resource "aws_security_group_rule" "otel_in_http_api_gw" {
  type                     = "ingress"
  security_group_id        = aws_security_group.otel_collector.id
  from_port                = 4318
  to_port                  = 4318
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.api_gateway.id
  description              = "OTLP HTTP from API Gateway"
}

resource "aws_security_group_rule" "otel_out_https" {
  type              = "egress"
  security_group_id = aws_security_group.otel_collector.id
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "HTTPS to X-Ray, CloudWatch, AMP"
}

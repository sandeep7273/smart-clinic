###############################################################################
# Security Groups Module
# Defines all SGs with least-privilege rules.
###############################################################################

# ── ALB Security Group ────────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${var.project}-${var.environment}-alb-sg"
  description = "ALB: accepts HTTPS from internet, forwards to API Gateway"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "To API Gateway on port 3000"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.api_gateway.id]
  }

  tags = { Name = "${var.project}-${var.environment}-alb-sg" }
}

# ── API Gateway Security Group ────────────────────────────────────────────────
resource "aws_security_group" "api_gateway" {
  name        = "${var.project}-${var.environment}-api-gateway-sg"
  description = "API Gateway ECS tasks: accepts from ALB, reaches internal services"
  vpc_id      = var.vpc_id

  ingress {
    description     = "From ALB on port 3000"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description     = "To internal services (REST)"
    from_port       = 4001
    to_port         = 4004
    protocol        = "tcp"
    security_groups = [aws_security_group.services.id]
  }

  egress {
    description     = "To AI service gRPC"
    from_port       = 50053
    to_port         = 50053
    protocol        = "tcp"
    security_groups = [aws_security_group.services.id]
  }

  egress {
    description = "HTTPS outbound (Secrets Manager, ECR, Groq API)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-${var.environment}-api-gateway-sg" }
}

# ── Internal Services Security Group ─────────────────────────────────────────
resource "aws_security_group" "services" {
  name        = "${var.project}-${var.environment}-services-sg"
  description = "Internal ECS services: auth, doctor, appointment, ai"
  vpc_id      = var.vpc_id

  ingress {
    description     = "REST from API Gateway"
    from_port       = 4001
    to_port         = 4004
    protocol        = "tcp"
    security_groups = [aws_security_group.api_gateway.id]
  }

  ingress {
    description = "gRPC inter-service (Doctor <-> Appointment, GW -> AI)"
    from_port   = 50051
    to_port     = 50053
    protocol    = "tcp"
    self        = true   # services can reach each other's gRPC ports
  }

  ingress {
    description     = "gRPC from API Gateway to AI service"
    from_port       = 50051
    to_port         = 50053
    protocol        = "tcp"
    security_groups = [aws_security_group.api_gateway.id]
  }

  egress {
    description     = "To database tier (MongoDB/Redis/MSK)"
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    security_groups = [aws_security_group.databases.id]
  }

  egress {
    description = "HTTPS outbound (Secrets Manager, ECR, Atlas, Groq)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-${var.environment}-services-sg" }
}

# ── Database Security Group ───────────────────────────────────────────────────
resource "aws_security_group" "databases" {
  name        = "${var.project}-${var.environment}-databases-sg"
  description = "Databases: Redis, MSK — reachable only from ECS services"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from ECS services"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.services.id]
  }

  ingress {
    description     = "Kafka (MSK plaintext) from ECS services"
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = [aws_security_group.services.id]
  }

  ingress {
    description     = "Kafka (MSK TLS) from ECS services"
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = [aws_security_group.services.id]
  }

  # No egress — databases cannot initiate connections
  tags = { Name = "${var.project}-${var.environment}-databases-sg" }
}

# ── OTel Collector Security Group ────────────────────────────────────────────
resource "aws_security_group" "otel_collector" {
  name        = "${var.project}-${var.environment}-otel-collector-sg"
  description = "OTel Collector: receives traces/metrics from all ECS services"
  vpc_id      = var.vpc_id

  ingress {
    description     = "OTLP HTTP from all services"
    from_port       = 4318
    to_port         = 4318
    protocol        = "tcp"
    security_groups = [aws_security_group.services.id, aws_security_group.api_gateway.id]
  }

  ingress {
    description     = "OTLP gRPC from all services"
    from_port       = 4317
    to_port         = 4317
    protocol        = "tcp"
    security_groups = [aws_security_group.services.id, aws_security_group.api_gateway.id]
  }

  egress {
    description = "HTTPS to X-Ray, CloudWatch, AMP"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-${var.environment}-otel-collector-sg" }
}

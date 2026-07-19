###############################################################################
# ECS Cluster Module
###############################################################################

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"   # CloudWatch Container Insights (CPU, mem, task count)
  }

  tags = { Name = "${var.project}-${var.environment}-cluster" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  # 70% on-demand Fargate (HA), 30% Spot (cost savings for non-critical tasks)
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 70
    base              = 2   # Always keep at least 2 on-demand tasks
  }

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 30
  }
}

# ── Service Connect Namespace (internal DNS for service-to-service) ────────────
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "${var.project}.local"
  vpc         = var.vpc_id
  description = "ECS Service Connect namespace for internal service discovery"
}

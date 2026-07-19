###############################################################################
# ECS Service Module — reusable for every microservice
#
# Usage: call once per service (api-gateway, auth, doctor, appointment, ai)
# Each invocation creates:
#   - CloudWatch log group
#   - ECS Task Definition (with X-Ray sidecar)
#   - ECS Service (with Service Connect for internal DNS)
#   - App Auto Scaling target + CPU/memory scaling policies
###############################################################################

data "aws_region" "current" {}

locals {
  full_name = "${var.project}-${var.environment}-${var.service_name}"
}

# ── CloudWatch Log Group ──────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "service" {
  name              = "/ecs/${var.project}/${var.environment}/${var.service_name}"
  retention_in_days = var.log_retention_days
}

# ── ECS Task Definition ───────────────────────────────────────────────────────
resource "aws_ecs_task_definition" "service" {
  family                   = local.full_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    # ── Application Container ─────────────────────────────────────────────
    {
      name      = var.service_name
      image     = var.image_uri
      essential = true

      portMappings = [
        {
          name          = var.service_name # used by Service Connect
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = var.environment_vars # non-sensitive config
      secrets     = var.secrets          # from Secrets Manager / SSM

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.service.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget -qO- http://localhost:${var.container_port}/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      # Resource limits — prevent runaway containers
      ulimits = [{
        name      = "nofile"
        softLimit = 65536
        hardLimit = 65536
      }]
    },

    # ── X-Ray Daemon Sidecar ──────────────────────────────────────────────
    {
      name      = "xray-daemon"
      image     = "amazon/aws-xray-daemon:latest"
      essential = false

      portMappings = [{
        containerPort = 2000
        protocol      = "udp"
      }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project}/${var.environment}/xray-daemon"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
          "awslogs-create-group"  = "true"
        }
      }

      environment = [
        { name = "AWS_REGION", value = data.aws_region.current.name }
      ]
    }
  ])

  tags = { ServiceName = var.service_name }
}

# ── ECS Service ───────────────────────────────────────────────────────────────
resource "aws_ecs_service" "service" {
  name                   = var.service_name
  cluster                = var.cluster_id
  task_definition        = aws_ecs_task_definition.service.arn
  desired_count          = var.desired_count
  enable_execute_command = var.environment != "prod" # ECS Exec only in non-prod

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 100
    base              = var.min_tasks
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  # ECS Service Connect — provides internal DNS: <service_name>.<namespace>
  service_connect_configuration {
    enabled   = true
    namespace = var.namespace_arn

    dynamic "service" {
      for_each = var.expose_via_service_connect ? [1] : []
      content {
        port_name      = var.service_name
        discovery_name = var.service_name
        client_alias {
          port     = var.container_port
          dns_name = "${var.service_name}.${var.project}.local"
        }
      }
    }
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Attach to ALB only for the API Gateway
  dynamic "load_balancer" {
    for_each = var.target_group_arn != "" ? [1] : []
    content {
      target_group_arn = var.target_group_arn
      container_name   = var.service_name
      container_port   = var.container_port
    }
  }

  lifecycle {
    ignore_changes = [desired_count] # Managed by auto-scaling
  }

  depends_on = [aws_ecs_task_definition.service]
}

# ── App Auto Scaling ──────────────────────────────────────────────────────────
resource "aws_appautoscaling_target" "service" {
  max_capacity       = var.max_tasks
  min_capacity       = var.min_tasks
  resource_id        = "service/${var.cluster_name}/${var.service_name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
  depends_on         = [aws_ecs_service.service]
}

# Scale on CPU
resource "aws_appautoscaling_policy" "cpu" {
  name               = "${local.full_name}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.service.resource_id
  scalable_dimension = aws_appautoscaling_target.service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.cpu_target_percent
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Scale on Memory
resource "aws_appautoscaling_policy" "memory" {
  name               = "${local.full_name}-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.service.resource_id
  scalable_dimension = aws_appautoscaling_target.service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.service.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.memory_target_percent
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ── CloudWatch Alarms ─────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${local.full_name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "${var.service_name} CPU > 85% — auto-scaling may be insufficient"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}

resource "aws_cloudwatch_metric_alarm" "task_count_low" {
  alarm_name          = "${local.full_name}-task-count-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = var.min_tasks
  alarm_description   = "${var.service_name} running tasks dropped below minimum"
  alarm_actions       = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = var.service_name
  }
}

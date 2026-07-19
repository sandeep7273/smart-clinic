###############################################################################
# CloudWatch Module
# Creates: log groups, metric alarms, SNS notifications, dashboard
###############################################################################

locals {
  services = [
    "api-gateway",
    "auth-service",
    "doctor-service",
    "appointment-service",
    "ai-service",
    "otel-collector",
  ]
}

# Log groups are created by each ecs-service module instance.
# This module only manages alarms and dashboards.

# ── ECS CPU Alarms (per service) ──────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  for_each            = toset(["api-gateway", "auth-service", "doctor-service", "appointment-service", "ai-service"])
  alarm_name          = "${var.project}-${var.environment}-${each.key}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = each.key == "ai-service" ? 85 : 80
  alarm_description   = "${each.key} CPU utilisation is critically high"
  alarm_actions       = [var.sns_topic_arn]
  ok_actions          = [var.sns_topic_arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = each.key
  }
}

# ── ECS Memory Alarms (per service) ──────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  for_each            = toset(["api-gateway", "auth-service", "doctor-service", "appointment-service", "ai-service"])
  alarm_name          = "${var.project}-${var.environment}-${each.key}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = each.key == "ai-service" ? 90 : 85
  alarm_description   = "${each.key} memory utilisation is critically high"
  alarm_actions       = [var.sns_topic_arn]
  ok_actions          = [var.sns_topic_arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = each.key
  }
}

# ── ALB 5xx Error Rate ────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "alb_5xx_high" {
  alarm_name          = "${var.project}-${var.environment}-alb-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xx errors > 10 per minute — investigate immediately"
  alarm_actions       = [var.sns_topic_arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

# ── ALB 4xx Error Rate ────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "alb_4xx_high" {
  alarm_name          = "${var.project}-${var.environment}-alb-4xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "HTTPCode_ELB_4XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "ALB 4xx errors > 100/min — possible client issue or bad deployment"
  alarm_actions       = [var.sns_topic_arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

# ── ALB Target Response Time (P99 latency) ────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "alb_latency_high" {
  alarm_name          = "${var.project}-${var.environment}-alb-latency-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 2
  alarm_description   = "ALB P99 response time > 2 seconds"
  alarm_actions       = [var.sns_topic_arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
}

# ── Unhealthy ECS Tasks ───────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "unhealthy_tasks" {
  for_each            = toset(["api-gateway", "auth-service", "doctor-service", "appointment-service", "ai-service"])
  alarm_name          = "${var.project}-${var.environment}-${each.key}-unhealthy-tasks"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "service.tasks.running"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Minimum"
  threshold           = 0
  alarm_description   = "${each.key} has zero running tasks — service is DOWN"
  alarm_actions       = [var.sns_topic_arn]
  treat_missing_data  = "breaching"   # if no data, assume broken

  dimensions = {
    ClusterName = var.cluster_name
    ServiceName = each.key
  }
}

# ── Redis Cache Alarms ────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "${var.project}-${var.environment}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Redis CPU > 90% — scale up node type"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ReplicationGroupId = var.redis_cluster_id
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_evictions" {
  alarm_name          = "${var.project}-${var.environment}-redis-evictions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "Redis evicting keys — memory may be too small"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ReplicationGroupId = var.redis_cluster_id
  }
}

# ── CloudWatch Dashboard (infrastructure overview) ───────────────────────────
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project}-${var.environment}-overview"

  dashboard_body = jsonencode({
    widgets = [
      {
        type       = "metric"
        width      = 12
        height     = 6
        properties = {
          title  = "ECS CPU Utilization %"
          region = var.aws_region
          period = 60
          stat   = "Average"
          view   = "timeSeries"
          metrics = [
            for svc in ["api-gateway", "auth-service", "doctor-service", "appointment-service", "ai-service"] :
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.cluster_name, "ServiceName", svc]
          ]
        }
      },
      {
        type       = "metric"
        width      = 12
        height     = 6
        properties = {
          title  = "ECS Memory Utilization %"
          region = var.aws_region
          period = 60
          stat   = "Average"
          view   = "timeSeries"
          metrics = [
            for svc in ["api-gateway", "auth-service", "doctor-service", "appointment-service", "ai-service"] :
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.cluster_name, "ServiceName", svc]
          ]
        }
      },
      {
        type       = "metric"
        width      = 8
        height     = 6
        properties = {
          title   = "ALB Request Count / min"
          region  = var.aws_region
          period  = 60
          stat    = "Sum"
          view    = "timeSeries"
          metrics = [["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix]]
        }
      },
      {
        type       = "metric"
        width      = 8
        height     = 6
        properties = {
          title  = "ALB Error Counts / min"
          region = var.aws_region
          period = 60
          stat   = "Sum"
          view   = "timeSeries"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", var.alb_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_ELB_4XX_Count", "LoadBalancer", var.alb_arn_suffix]
          ]
        }
      },
      {
        type       = "metric"
        width      = 8
        height     = 6
        properties = {
          title   = "ALB P99 Response Time (s)"
          region  = var.aws_region
          period  = 60
          stat    = "p99"
          view    = "timeSeries"
          metrics = [["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix]]
        }
      },
    ]
  })
}

# ── SNS subscriptions (Slack + email) ─────────────────────────────────────────
resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = var.sns_topic_arn
  protocol  = "email"
  endpoint  = var.alert_email
}

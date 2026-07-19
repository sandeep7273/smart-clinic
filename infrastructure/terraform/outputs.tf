output "alb_dns_name" {
  description = "ALB DNS name — point your Route 53 record here"
  value       = module.alb.alb_dns_name
}

output "ecr_repository_urls" {
  description = "Map of service → ECR repository URL (use in CI/CD)"
  value       = module.ecr.repository_urls
}

output "ecs_cluster_name" {
  value = module.ecs_cluster.cluster_name
}

output "redis_endpoint" {
  value = module.redis.redis_endpoint
}

output "github_actions_role_arn" {
  description = "Role ARN to put in GitHub Actions secrets (AWS_ROLE_ARN)"
  value       = module.iam.github_actions_role_arn
}

output "alerts_sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}

# Phase 8 — Observability outputs
output "amp_workspace_id" {
  description = "Amazon Managed Prometheus workspace ID"
  value       = module.prometheus.workspace_id
}

output "amp_query_url" {
  description = "AMP query endpoint — use as Grafana data source URL"
  value       = module.prometheus.query_url
}

output "otel_collector_endpoint" {
  description = "Internal OTel Collector endpoint used by all ECS services"
  value       = module.otel_collector.otel_collector_endpoint
}

output "cloudwatch_dashboard" {
  description = "CloudWatch Dashboard name — open in AWS Console"
  value       = module.cloudwatch.dashboard_name
}

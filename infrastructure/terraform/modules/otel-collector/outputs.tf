output "otel_collector_endpoint" {
  value = "http://otel-collector.${var.project}.local:4318"
}
output "task_role_arn" {
  value = aws_iam_role.otel_task_role.arn
}

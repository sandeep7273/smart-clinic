###############################################################################
# Amazon Managed Prometheus (AMP) Module
#
# AMP is a fully managed, Prometheus-compatible metrics store.
# The OTel Collector writes metrics here via remote_write.
# Grafana reads from here as a data source.
# No Prometheus server to manage, patch, or scale.
###############################################################################

resource "aws_prometheus_workspace" "main" {
  alias = "${var.project}-${var.environment}"

  logging_configuration {
    log_group_arn = "${aws_cloudwatch_log_group.amp.arn}:*"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-amp"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "amp" {
  name              = "/aws/prometheus/${var.project}-${var.environment}"
  retention_in_days = 7
}

# ── Alert Manager (rules evaluated inside AMP) ────────────────────────────────
resource "aws_prometheus_alert_manager_definition" "main" {
  workspace_id = aws_prometheus_workspace.main.id

  definition = <<-EOT
    alertmanager_config: |
      route:
        receiver: sns
      receivers:
        - name: sns
          sns_configs:
            - topic_arn: ${var.sns_topic_arn}
              sigv4:
                region: ${var.aws_region}
              message: |-
                alert: {{ .CommonLabels.alertname }}
                service: {{ .CommonLabels.service }}
                severity: {{ .CommonLabels.severity }}
                summary: {{ .CommonAnnotations.summary }}
  EOT
}

# ── Recording + Alerting Rules ─────────────────────────────────────────────────
resource "aws_prometheus_rule_group_namespace" "smartclinic" {
  name         = "smartclinic-rules"
  workspace_id = aws_prometheus_workspace.main.id

  data = <<-EOT
    groups:
      # ── Service SLO alerts ──────────────────────────────────────────────────
      - name: service_slos
        interval: 30s
        rules:

          # Alert: high error rate on any service
          - alert: HighErrorRate
            expr: |
              (
                rate(http_requests_total{status_code=~"5.."}[5m])
                /
                rate(http_requests_total[5m])
              ) > 0.01
            for: 2m
            labels:
              severity: critical
            annotations:
              summary: "High 5xx error rate on {{ $labels.service }}"
              description: "Error rate is {{ $value | humanizePercentage }} on {{ $labels.service }}"

          # Alert: P99 latency too high
          - alert: HighP99Latency
            expr: |
              histogram_quantile(0.99,
                rate(http_request_duration_seconds_bucket[5m])
              ) > 2
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "P99 latency > 2s on {{ $labels.service }}"
              description: "P99 is {{ $value | humanizeDuration }} on {{ $labels.service }}"

          # Alert: AI service latency (LLM is slower — higher threshold)
          - alert: AIServiceHighLatency
            expr: |
              histogram_quantile(0.95,
                rate(http_request_duration_seconds_bucket{service="ai-service"}[5m])
              ) > 15
            for: 5m
            labels:
              severity: warning
            annotations:
              summary: "AI service P95 latency > 15s"

      # ── Business metric alerts ───────────────────────────────────────────────
      - name: business_alerts
        rules:

          # Alert: no appointments being created (may indicate booking broken)
          - alert: NoAppointmentsCreated
            expr: rate(appointments_created_total[30m]) == 0
            for: 30m
            labels:
              severity: warning
            annotations:
              summary: "No appointments created in 30 minutes"

      # ── Recording rules (pre-computed for Grafana performance) ─────────────
      - name: recording_rules
        rules:
          - record: job:http_requests_total:rate5m
            expr: rate(http_requests_total[5m])

          - record: job:http_request_duration_seconds:p99
            expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

          - record: job:http_request_duration_seconds:p95
            expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

          - record: job:http_request_duration_seconds:p50
            expr: histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))
  EOT
}

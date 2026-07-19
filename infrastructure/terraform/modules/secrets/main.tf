###############################################################################
# Secrets Module — creates all Secrets Manager entries
###############################################################################

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project}/${var.environment}/auth-service/JWT_SECRET"
  description             = "JWT signing secret for auth-service and api-gateway"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

resource "aws_secretsmanager_secret" "jwt_refresh_secret" {
  name                    = "${var.project}/${var.environment}/auth-service/JWT_REFRESH_SECRET"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "jwt_refresh_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_refresh_secret.id
  secret_string = var.jwt_refresh_secret
}

# ── MongoDB URIs (one per service) ────────────────────────────────────────────
locals {
  mongodb_services = ["auth-service", "doctor-service", "appointment-service", "ai-service"]
}

resource "aws_secretsmanager_secret" "mongodb_uri" {
  for_each                = toset(local.mongodb_services)
  name                    = "${var.project}/${var.environment}/${each.key}/MONGODB_URI"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "mongodb_uri" {
  for_each      = aws_secretsmanager_secret.mongodb_uri
  secret_id     = each.value.id
  secret_string = var.mongodb_uri
}

# ── Groq API Key (AI service) ─────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "groq_api_key" {
  name                    = "${var.project}/${var.environment}/ai-service/GROQ_API_KEY"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "groq_api_key" {
  secret_id     = aws_secretsmanager_secret.groq_api_key.id
  secret_string = var.groq_api_key
}

# ── Internal Service Token (api-gateway) ──────────────────────────────────────
resource "aws_secretsmanager_secret" "internal_token" {
  name                    = "${var.project}/${var.environment}/api-gateway/INTERNAL_SERVICE_TOKEN"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "internal_token" {
  secret_id     = aws_secretsmanager_secret.internal_token.id
  secret_string = var.internal_service_token
}

# ── SSM Parameter Store (non-sensitive config) ────────────────────────────────
resource "aws_ssm_parameter" "config" {
  for_each = var.ssm_parameters
  name     = "/${var.project}/${var.environment}/${each.key}"
  type     = "String"
  value    = each.value
}

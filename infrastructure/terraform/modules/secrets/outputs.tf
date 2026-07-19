output "jwt_secret_arn" { value = aws_secretsmanager_secret.jwt_secret.arn }
output "jwt_refresh_secret_arn" { value = aws_secretsmanager_secret.jwt_refresh_secret.arn }
output "groq_api_key_arn" { value = aws_secretsmanager_secret.groq_api_key.arn }
output "internal_token_arn" { value = aws_secretsmanager_secret.internal_token.arn }
output "mongodb_uri_arns" { value = { for k, v in aws_secretsmanager_secret.mongodb_uri : k => v.arn } }

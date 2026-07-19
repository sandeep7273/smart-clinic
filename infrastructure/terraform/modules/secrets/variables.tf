variable "project"               { type = string }
variable "environment"           { type = string }
variable "jwt_secret"            { type = string; sensitive = true }
variable "jwt_refresh_secret"    { type = string; sensitive = true }
variable "mongodb_uri"           { type = string; sensitive = true }
variable "groq_api_key"          { type = string; sensitive = true }
variable "internal_service_token"{ type = string; sensitive = true }
variable "ssm_parameters" {
  type    = map(string)
  default = {}
}

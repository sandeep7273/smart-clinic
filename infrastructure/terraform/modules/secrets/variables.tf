variable "project"            { type = string }
variable "environment"        { type = string }
variable "jwt_secret" {
  type      = string
  sensitive = true
}
variable "jwt_refresh_secret" {
  type      = string
  sensitive = true
}
variable "mongodb_uris" {
  description = "Map of service name -> MongoDB Atlas URI (each service has its own database)"
  type        = map(string)
  sensitive   = true
  default     = {}
}
variable "groq_api_key" {
  type      = string
  sensitive = true
}
variable "internal_service_token" {
  type      = string
  sensitive = true
}
variable "ssm_parameters" {
  type    = map(string)
  default = {}
}

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev | staging | prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod"
  }
}

variable "project" {
  description = "Project name used in resource naming and tags"
  type        = string
  default     = "smartclinic"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of AZs to deploy across (minimum 2 for HA)"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "api_gateway_image" {
  description = "Full ECR image URI for api-gateway"
  type        = string
}

variable "auth_service_image" {
  description = "Full ECR image URI for auth-service"
  type        = string
}

variable "doctor_service_image" {
  description = "Full ECR image URI for doctor-service"
  type        = string
}

variable "appointment_service_image" {
  description = "Full ECR image URI for appointment-service"
  type        = string
}

variable "ai_service_image" {
  description = "Full ECR image URI for ai-service"
  type        = string
}

variable "domain_name" {
  description = "Base domain name (e.g. smartclinic.com)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for HTTPS. Leave empty for HTTP only (dev)."
  type        = string
  default     = ""
}

variable "mongodb_uris" {
  description = "Map of service name -> MongoDB Atlas URI (each service has its own database)"
  type        = map(string)
  sensitive   = true
  default     = {}
}

variable "groq_api_key" {
  description = "Groq LLM API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "JWT signing secret — minimum 32 random bytes"
  type        = string
  sensitive   = true
  default     = ""
}

variable "api_gateway_min_tasks" {
  type    = number
  default = 2
}
variable "api_gateway_max_tasks" {
  type    = number
  default = 6
}
variable "auth_service_min_tasks" {
  type    = number
  default = 2
}
variable "auth_service_max_tasks" {
  type    = number
  default = 4
}
variable "doctor_service_min_tasks" {
  type    = number
  default = 2
}
variable "doctor_service_max_tasks" {
  type    = number
  default = 10
}
variable "appointment_service_min_tasks" {
  type    = number
  default = 4
}
variable "appointment_service_max_tasks" {
  type    = number
  default = 30
}
variable "ai_service_min_tasks" {
  type    = number
  default = 1
}
variable "ai_service_max_tasks" {
  type    = number
  default = 20
}

variable "alert_email" {
  description = "Email address to receive CloudWatch alarm notifications."
  type        = string
  default     = ""
}

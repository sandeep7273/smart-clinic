variable "project" {
  description = "Project name used in resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "aws_region" {
  description = "AWS region where the S3 website bucket is hosted."
  type        = string
}

variable "web_ui_bucket_name" {
  description = "S3 bucket name hosting the web/mobile static assets."
  type        = string
}

variable "acm_certificate_arn" {
  description = "Optional us-east-1 ACM certificate ARN for CloudFront aliases."
  type        = string
  default     = ""
}

variable "aliases" {
  description = "Optional custom domain aliases for the distribution."
  type        = list(string)
  default     = []
}

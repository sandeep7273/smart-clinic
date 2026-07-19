variable "project" { type = string }
variable "environment" { type = string }
variable "cluster_name" { type = string }
variable "alb_arn_suffix" { type = string }
variable "sns_topic_arn" { type = string }
variable "aws_region" {
  type    = string
  default = "ap-south-1"
}
variable "redis_cluster_id" {
  type    = string
  default = ""
}
variable "log_retention_days" {
  type    = number
  default = 30
}
variable "alert_email" {
  type    = string
  default = ""
}

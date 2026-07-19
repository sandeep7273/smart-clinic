variable "project" { type = string }
variable "environment" { type = string }
variable "aws_region" {
  type    = string
  default = "ap-south-1"
}
variable "sns_topic_arn" {
  type    = string
  default = ""
}

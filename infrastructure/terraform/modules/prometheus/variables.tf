variable "project"      { type = string }
variable "environment"  { type = string }
variable "aws_region" {
  type    = string
  default = "us-east-1"
}
variable "sns_topic_arn" {
  type    = string
  default = ""
}

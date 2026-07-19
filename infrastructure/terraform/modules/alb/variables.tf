variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "alb_sg_id" { type = string }
variable "acm_certificate_arn" {
  type    = string
  default = ""
}
variable "account_id" { type = string }
variable "elb_account_id" {
  type        = string
  description = "AWS ELB service account ID for the region (for ALB log bucket policy). us-east-1 = 127311923021"
  default     = "127311923021"
}

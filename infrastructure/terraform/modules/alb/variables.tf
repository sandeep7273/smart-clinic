variable "project"            { type = string }
variable "environment"        { type = string }
variable "vpc_id"             { type = string }
variable "public_subnet_ids"  { type = list(string) }
variable "alb_sg_id"          { type = string }
variable "acm_certificate_arn"{ type = string; default = "" }
variable "account_id"         { type = string }
variable "elb_account_id"     {
  type        = string
  description = "AWS ELB account ID for the region (needed for ALB log bucket policy)"
  default     = "127311923021"   # us-east-1 — update per region: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
}

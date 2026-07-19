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
  description = "AWS ELB service account ID for the region (for ALB log bucket policy). ap-south-1 = 718504428378"
  default     = "718504428378"
}
variable "region_short" {
  type        = string
  description = "Short region identifier for globally-unique bucket names (e.g. aps1)"
  default     = "aps1"
}

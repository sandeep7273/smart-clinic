variable "project" { type = string }
variable "environment" { type = string }
variable "database_subnet_ids" { type = list(string) }
variable "databases_sg_id" { type = string }
variable "node_type" {
  type    = string
  default = "cache.t4g.micro"
}

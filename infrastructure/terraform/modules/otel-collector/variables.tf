variable "project"               { type = string }
variable "environment"           { type = string }
variable "cluster_id"            { type = string }
variable "namespace_arn"         { type = string }
variable "private_subnet_ids"    { type = list(string) }
variable "otel_collector_sg_id"  { type = string }
variable "task_execution_role_arn" { type = string }
variable "amp_workspace_arn"     { type = string; default = "" }
variable "amp_remote_write_url"  { type = string; default = "" }

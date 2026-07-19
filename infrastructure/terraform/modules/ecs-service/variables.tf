variable "project"              { type = string }
variable "environment"          { type = string }
variable "service_name"         { type = string }
variable "image_uri"            { type = string }
variable "cluster_id"           { type = string }
variable "cluster_name"         { type = string }
variable "namespace_arn"        { type = string }
variable "task_execution_role_arn" { type = string }
variable "task_role_arn"        { type = string }
variable "private_subnet_ids"   { type = list(string) }
variable "security_group_ids"   { type = list(string) }

variable "container_port"       { type = number }
variable "cpu"                  { type = number; default = 512 }
variable "memory"               { type = number; default = 1024 }
variable "desired_count"        { type = number; default = 2 }
variable "min_tasks"            { type = number; default = 2 }
variable "max_tasks"            { type = number; default = 10 }
variable "cpu_target_percent"   { type = number; default = 60 }
variable "memory_target_percent"{ type = number; default = 70 }
variable "log_retention_days"   { type = number; default = 30 }

variable "environment_vars" {
  type    = list(object({ name = string, value = string }))
  default = []
}

variable "secrets" {
  type    = list(object({ name = string, valueFrom = string }))
  default = []
  sensitive = true
}

variable "target_group_arn"          { type = string; default = "" }
variable "expose_via_service_connect" { type = bool; default = true }
variable "alarm_sns_topic_arn"       { type = string; default = "" }

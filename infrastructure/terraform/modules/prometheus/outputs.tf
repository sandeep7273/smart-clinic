output "workspace_id"        { value = aws_prometheus_workspace.main.id }
output "workspace_arn"       { value = aws_prometheus_workspace.main.arn }
output "prometheus_endpoint" { value = aws_prometheus_workspace.main.prometheus_endpoint }
output "remote_write_url"    { value = "${aws_prometheus_workspace.main.prometheus_endpoint}api/v1/remote_write" }
output "query_url"           { value = "${aws_prometheus_workspace.main.prometheus_endpoint}api/v1/query" }

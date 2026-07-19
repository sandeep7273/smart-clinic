output "alb_sg_id"            { value = aws_security_group.alb.id }
output "api_gateway_sg_id"   { value = aws_security_group.api_gateway.id }
output "services_sg_id"      { value = aws_security_group.services.id }
output "databases_sg_id"     { value = aws_security_group.databases.id }
output "otel_collector_sg_id"{ value = aws_security_group.otel_collector.id }

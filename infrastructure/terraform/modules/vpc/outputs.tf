output "vpc_id" { value = aws_vpc.main.id }
output "public_subnet_ids" { value = aws_subnet.public[*].id }
output "private_subnet_ids" { value = aws_subnet.private[*].id }
output "database_subnet_ids" { value = aws_subnet.database[*].id }
output "nat_public_ips" {
  description = "Elastic IPs of the NAT Gateways — add these to MongoDB Atlas IP Access List"
  value       = aws_eip.nat[*].public_ip
}

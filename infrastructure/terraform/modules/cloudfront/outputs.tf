output "distribution_id" {
  description = "CloudFront distribution ID for cache invalidations."
  value       = aws_cloudfront_distribution.web_ui.id
}

output "domain_name" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.web_ui.domain_name
}

output "hosted_zone_id" {
  description = "CloudFront hosted zone ID for Route 53 alias records."
  value       = aws_cloudfront_distribution.web_ui.hosted_zone_id
}

###############################################################################
# CloudFront Module — CDN for static web/mobile assets hosted on S3 website
###############################################################################

locals {
  origin_id         = "${var.project}-${var.environment}-web-ui-s3-website"
  s3_website_domain = "${var.web_ui_bucket_name}.s3-website.${var.aws_region}.amazonaws.com"
}

resource "aws_cloudfront_distribution" "web_ui" {
  enabled             = true
  comment             = "${var.project}-${var.environment} web UI CDN"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  aliases             = var.aliases

  origin {
    domain_name = local.s3_website_domain
    origin_id   = local.origin_id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 31536000
  }

  ordered_cache_behavior {
    path_pattern           = "index.html"
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.acm_certificate_arn == "" ? true : false
    acm_certificate_arn            = var.acm_certificate_arn == "" ? null : var.acm_certificate_arn
    ssl_support_method             = var.acm_certificate_arn == "" ? null : "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-web-ui-cdn"
    Environment = var.environment
  }
}

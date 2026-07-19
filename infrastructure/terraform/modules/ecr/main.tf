###############################################################################
# ECR Module — one repository per service
###############################################################################

locals {
  services = [
    "api-gateway",
    "auth-service",
    "doctor-service",
    "appointment-service",
    "ai-service",
  ]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.services)
  name                 = "${var.project}/${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true   # ECR vulnerability scan every push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = { Name = "${var.project}/${each.key}" }
}

# Keep the last 10 images; expire anything older
resource "aws_ecr_lifecycle_policy" "cleanup" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["v", "sha"]
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after 3 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 3
        }
        action = { type = "expire" }
      }
    ]
  })
}

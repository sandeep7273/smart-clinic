terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state — one workspace per environment
  backend "s3" {
    bucket         = "smartclinic-terraform-state"
    key            = "global/state.tfstate"
    region         = "us-east-1"
    dynamodb_table = "smartclinic-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "smart-clinic"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

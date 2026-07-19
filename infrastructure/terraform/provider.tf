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
    bucket         = "smartclinic-terraform-state-791732163161-aps1"
    key            = "global/state.tfstate"
    region         = "ap-south-1"
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

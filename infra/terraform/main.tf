terraform {
  required_version = ">= 1.8.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

locals {
  db_name          = replace(lower(var.project_name), "-", "_")
  db_username      = var.db_admin_username
  subnet_name      = "${var.project_name}-${var.environment}-db"
  security_group   = "${var.project_name}-${var.environment}-db"
  secrets_prefix   = "/${var.project_name}/${var.environment}" 
}

module "network" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"

  name = "${var.project_name}-${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    "Tier" = "network"
  }
}

data "aws_availability_zones" "available" {}

resource "aws_security_group" "db" {
  name        = local.security_group
  description = "Database access"
  vpc_id      = module.network.vpc_id

  ingress {
    description = "App access"
    from_port   = var.db_port
    to_port     = var.db_port
    protocol    = "tcp"
    cidr_blocks = var.application_cidr_allowlist
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "-_@"
}

resource "aws_secretsmanager_secret" "db_admin" {
  name        = "${local.secrets_prefix}/db-admin"
  description = "Admin credentials for the AS Agents Aurora cluster"
}

resource "aws_secretsmanager_secret_version" "db_admin" {
  secret_id     = aws_secretsmanager_secret.db_admin.id
  secret_string = jsonencode({
    username = local.db_username
    password = coalesce(var.db_admin_password_override, random_password.db.result)
  })
}

module "aurora" {
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "9.7.0"

  name                   = "${var.project_name}-${var.environment}"
  engine                 = "aurora-postgresql"
  engine_mode            = "provisioned"
  engine_version         = var.db_engine_version
  instance_class         = var.db_instance_class
  instances              = var.db_instance_count
  publicly_accessible    = false
  apply_immediately      = true
  skip_final_snapshot    = var.skip_final_snapshot
  master_username        = local.db_username
  master_password        = coalesce(var.db_admin_password_override, random_password.db.result)
  database_name          = local.db_name
  port                   = var.db_port
  storage_encrypted      = true
  backup_retention_period = var.db_backup_retention_days
  preferred_backup_window = var.db_backup_window
  deletion_protection     = var.enable_deletion_protection

  vpc_id                 = module.network.vpc_id
  db_subnet_group_name   = module.network.database_subnet_group
  subnet_ids             = module.network.private_subnets
  security_group_ids     = [aws_security_group.db.id]

  enabled_cloudwatch_logs_exports = ["postgresql"]

  performance_insights_enabled = true
  performance_insights_retention_period = 7

  tags = {
    "Tier" = "database"
  }

  timeouts = {
    create = "60m"
    update = "60m"
    delete = "60m"
  }
}

# Optional: replica cluster for read-heavy analytics workloads
module "aurora_read" {
  count   = var.enable_read_replica ? 1 : 0
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "9.7.0"

  name             = "${var.project_name}-${var.environment}-reader"
  engine           = module.aurora.cluster_engine
  engine_version   = module.aurora.cluster_engine_version_actual
  engine_mode      = "provisioned"
  sources          = [module.aurora.cluster_arn]
  instance_class   = var.db_instance_class
  instances        = 1
  publicly_accessible = false
  vpc_id           = module.network.vpc_id
  subnet_ids       = module.network.private_subnets
  security_group_ids = [aws_security_group.db.id]

  depends_on = [module.aurora]
}

resource "aws_ssm_parameter" "db_connection" {
  name        = "${local.secrets_prefix}/db-url"
  description = "JDBC connection string for the AS Agents application"
  type        = "SecureString"
  value       = "postgresql://${local.db_username}:${coalesce(var.db_admin_password_override, random_password.db.result)}@${module.aurora.cluster_endpoint}:${var.db_port}/${local.db_name}"
}

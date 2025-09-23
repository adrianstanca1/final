variable "project_name" {
  description = "Slug used for tagging and resource naming"
  type        = string
  default     = "as-agents"
}

variable "environment" {
  description = "Deployment environment (e.g. staging, production)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for provisioning core infrastructure"
  type        = string
  default     = "eu-west-2"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.60.0.0/16"
}

variable "private_subnet_cidrs" {
  description = "Private subnets for database/application tier"
  type        = list(string)
  default     = [
    "10.60.1.0/24",
    "10.60.2.0/24",
    "10.60.3.0/24"
  ]
}

variable "public_subnet_cidrs" {
  description = "Public subnets for load balancers / NAT gateways"
  type        = list(string)
  default     = [
    "10.60.101.0/24",
    "10.60.102.0/24",
    "10.60.103.0/24"
  ]
}

variable "application_cidr_allowlist" {
  description = "CIDR ranges that may access the database (typically the application VPC)"
  type        = list(string)
  default     = ["10.60.0.0/16"]
}

variable "db_port" {
  description = "PostgreSQL port"
  type        = number
  default     = 5432
}

variable "db_admin_username" {
  description = "Database master username"
  type        = string
  default     = "construct_admin"
}

variable "db_admin_password_override" {
  description = "Optional password override for the database admin user"
  type        = string
  sensitive   = true
  default     = null
}

variable "db_engine_version" {
  description = "Aurora PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "db_instance_class" {
  description = "Instance class for writer/reader nodes"
  type        = string
  default     = "db.serverless"
}

variable "db_instance_count" {
  description = "Number of writer instances"
  type        = number
  default     = 1
}

variable "db_backup_retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "db_backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-05:00"
}

variable "enable_deletion_protection" {
  description = "Protect the cluster from accidental deletion"
  type        = bool
  default     = true
}

variable "enable_read_replica" {
  description = "Provision a dedicated read replica cluster"
  type        = bool
  default     = false
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on destroy"
  type        = bool
  default     = false
}

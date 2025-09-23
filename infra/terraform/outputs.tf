output "db_admin_secret_arn" {
  description = "ARN of the admin credentials stored in Secrets Manager"
  value       = aws_secretsmanager_secret.db_admin.arn
}

output "db_writer_endpoint" {
  description = "Writer endpoint for the Aurora cluster"
  value       = module.aurora.cluster_endpoint
}

output "db_reader_endpoint" {
  description = "Read replica endpoint for reporting workloads"
  value       = module.aurora.cluster_reader_endpoint
}

output "db_connection_parameter" {
  description = "SSM parameter storing the JDBC connection string"
  value       = aws_ssm_parameter.db_connection.name
}

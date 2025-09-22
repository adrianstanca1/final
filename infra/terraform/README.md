# Terraform Infrastructure Scaffolding

This module provisions the production-grade data layer for AS Agents. It targets **Amazon Aurora PostgreSQL** to satisfy the platform's transactional and analytical requirements while supporting future-read replicas for reporting workloads.

## Stack Components

- **VPC & subnets** – created with the official `terraform-aws-modules/vpc` module, producing public subnets for ingress tooling and private subnets for application/database tiers.
- **Aurora PostgreSQL cluster** – highly available writer with optional reader cluster, Performance Insights, and CloudWatch log exports enabled.
- **Secrets Manager & SSM** – stores database administrator credentials and a generated JDBC connection string for downstream services (API, data workers, analytics pipelines).
- **Security groups** – constrained to the application CIDR allowlist. Update `application_cidr_allowlist` when deploying the API or additional workloads in separate VPCs.

## Usage

1. Install Terraform >= 1.8 and authenticate with AWS (IAM user or role).
2. Adjust `terraform.tfvars` (or provide CLI variables) for environment-specific values:
   - `environment = "staging"`
   - `aws_region = "eu-west-2"`
   - `application_cidr_allowlist = ["10.80.0.0/16"]`
3. (Optional) Provide `db_admin_password_override` through a secure variable store (Terraform Cloud, SSM, GitHub Actions secret). When omitted a random password is generated and stored in Secrets Manager.
4. Plan and apply:

```bash
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Outputs

- `db_admin_secret_arn` – Secrets Manager ARN storing admin credentials.
- `db_writer_endpoint` – Writer endpoint for application connections.
- `db_reader_endpoint` – Read-only endpoint for analytics or heavy reporting.
- `db_connection_parameter` – SSM secure parameter containing a JDBC connection string.

## Next Steps

- Provision an ECS/Fargate (or Kubernetes) task to run the API, referencing the generated Secrets Manager secret.
- Wire automated migrations (Prisma/Knex/Flyway) via CI/CD when new schema changes merge to `main`.
- Layer on top a data warehouse sync (BigQuery/Snowflake) fed by logical replication or Debezium when analytics features are prioritised.

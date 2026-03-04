---
name: terraform-engineer
description: Use for writing Terraform infrastructure-as-code, managing state, creating modules, planning/applying changes, or migrating existing infrastructure to Terraform. Triggers: "Terraform", "IaC", "infrastructure as code", "tf file", "terraform plan", "terraform apply", "tfstate", "terraform module", or when infrastructure needs to be version-controlled and repeatable.
---

# Terraform Engineer Skill

Write production-grade Terraform: reusable modules, remote state, workspace-per-environment, and safe plan/apply workflows.

---

## Project Structure

```
infrastructure/
├── environments/
│   ├── dev/
│   │   ├── main.tf          ← calls root modules
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── terraform.tfvars ← env-specific values (gitignored for secrets)
│   ├── staging/
│   │   └── (same structure)
│   └── production/
│       └── (same structure)
│
├── modules/
│   ├── vpc/                 ← reusable VPC module
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── ecs-service/         ← reusable ECS service module
│   ├── rds/                 ← reusable RDS module
│   └── lambda/              ← reusable Lambda module
│
├── .terraform.lock.hcl      ← provider version lock (commit this)
└── README.md
```

---

## Remote State (S3 + DynamoDB locking)

```hcl
# environments/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789:key/xxx"
    dynamodb_table = "terraform-state-lock"  # prevents concurrent applies
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # pin minor version
    }
  }

  required_version = ">= 1.6.0"
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
      Owner       = var.team_name
    }
  }
}
```

```bash
# One-time setup: create state bucket + lock table
aws s3api create-bucket --bucket my-company-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket my-company-terraform-state \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket my-company-terraform-state \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"aws:kms"}}]}'

aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

---

## VPC Module

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${var.name}-vpc" }
}

resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index)
  availability_zone = var.availability_zones[count.index]
  map_public_ip_on_launch = false  # never auto-assign public IPs

  tags = { Name = "${var.name}-public-${var.availability_zones[count.index]}" }
}

resource "aws_subnet" "private_app" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = { Name = "${var.name}-private-app-${var.availability_zones[count.index]}" }
}

resource "aws_subnet" "private_db" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index + 20)
  availability_zone = var.availability_zones[count.index]

  tags = { Name = "${var.name}-private-db-${var.availability_zones[count.index]}" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.name}-igw" }
}

resource "aws_eip" "nat" {
  count  = var.single_nat_gateway ? 1 : length(var.availability_zones)
  domain = "vpc"
  tags   = { Name = "${var.name}-nat-eip-${count.index}" }
}

resource "aws_nat_gateway" "main" {
  count         = var.single_nat_gateway ? 1 : length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  depends_on    = [aws_internet_gateway.main]
  tags          = { Name = "${var.name}-nat-${count.index}" }
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${var.name}-public-rt" }
}

resource "aws_route_table" "private_app" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.main[0].id : aws_nat_gateway.main[count.index].id
  }
  tags = { Name = "${var.name}-private-app-rt-${count.index}" }
}

# Route table associations
resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_app" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private_app[count.index].id
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/${var.name}/flow-logs"
  retention_in_days = 30
}
```

```hcl
# modules/vpc/variables.tf
variable "name"               { type = string }
variable "cidr_block"         { type = string; default = "10.0.0.0/16" }
variable "availability_zones" { type = list(string) }
variable "single_nat_gateway" { type = bool; default = false; description = "Set true for dev to save cost" }

# modules/vpc/outputs.tf
output "vpc_id"              { value = aws_vpc.main.id }
output "public_subnet_ids"   { value = aws_subnet.public[*].id }
output "private_app_subnet_ids" { value = aws_subnet.private_app[*].id }
output "private_db_subnet_ids"  { value = aws_subnet.private_db[*].id }
```

---

## ECS Service Module

```hcl
# modules/ecs-service/main.tf
resource "aws_ecs_cluster" "main" {
  name = var.cluster_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_service" "main" {
  name            = var.service_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.main.arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  deployment_circuit_breaker {
    enable   = true   # auto-rollback on failed deployment
    rollback = true
  }

  deployment_controller { type = "ECS" }

  lifecycle {
    ignore_changes = [desired_count]  # managed by autoscaling
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.service_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

---

## RDS Module

```hcl
# modules/rds/main.tf
resource "aws_db_subnet_group" "main" {
  name       = "${var.identifier}-subnet-group"
  subnet_ids = var.db_subnet_ids
}

resource "aws_db_instance" "main" {
  identifier             = var.identifier
  engine                 = "postgres"
  engine_version         = var.engine_version
  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage
  max_allocated_storage  = var.max_allocated_storage  # storage autoscaling
  storage_type           = "gp3"
  storage_encrypted      = true
  kms_key_id             = var.kms_key_id

  db_name  = var.db_name
  username = var.username
  password = var.password  # use random_password resource + Secrets Manager

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az               = var.multi_az
  publicly_accessible    = false
  deletion_protection    = var.deletion_protection
  skip_final_snapshot    = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${var.identifier}-final-snapshot" : null

  backup_retention_period = var.backup_retention_days
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  performance_insights_enabled = true
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  lifecycle {
    prevent_destroy = true  # safety for production databases
  }
}

# Generate secure password + store in Secrets Manager
resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.identifier}/db-password"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = var.username
    password = random_password.db.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = var.db_name
  })
}
```

---

## Safe Plan/Apply Workflow

```bash
# Safe Terraform workflow — never apply without review

# 1. Format check
terraform fmt -check -recursive

# 2. Validate
terraform validate

# 3. Plan to file (review before applying)
terraform plan -out=tfplan -var-file=production.tfvars

# 4. Show human-readable plan
terraform show tfplan

# 5. Apply from saved plan (not interactive)
terraform apply tfplan

# Destroy requires explicit approval
terraform plan -destroy -out=destroy-plan
terraform apply destroy-plan

# Drift detection (what changed outside Terraform)
terraform plan -refresh-only
```

---

## Terraform in CI/CD (GitHub Actions)

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]
    paths: ['infrastructure/**']
  pull_request:
    paths: ['infrastructure/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # OIDC auth to AWS
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC — no static keys)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/github-actions-terraform
          aws-region: us-east-1

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.0"

      - run: terraform fmt -check
        working-directory: infrastructure/environments/production

      - run: terraform init
        working-directory: infrastructure/environments/production

      - run: terraform validate
        working-directory: infrastructure/environments/production

      - name: Terraform Plan
        id: plan
        working-directory: infrastructure/environments/production
        run: terraform plan -no-color -out=tfplan
        continue-on-error: true

      - name: Comment plan on PR
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const output = `#### Terraform Plan 📖
            \`\`\`\n${{ steps.plan.outputs.stdout }}\`\`\``;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        working-directory: infrastructure/environments/production
        run: terraform apply -auto-approve tfplan
```

---

## Common Patterns Cheatsheet

```hcl
# Data sources — reference existing resources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_vpc" "selected" { id = var.vpc_id }

# Locals — computed values
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  name_prefix = "${var.project}-${var.environment}"
}

# Dynamic blocks — avoid repetition
resource "aws_security_group" "app" {
  dynamic "ingress" {
    for_each = var.allowed_ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = [var.vpc_cidr]
    }
  }
}

# depends_on — explicit ordering
resource "aws_ecs_service" "app" {
  depends_on = [aws_alb_listener.http]
}

# lifecycle — protect resources
resource "aws_db_instance" "main" {
  lifecycle {
    prevent_destroy       = true
    ignore_changes        = [password]  # managed externally
    create_before_destroy = false
  }
}
```

---

## Output Files

```
infrastructure/
  environments/dev/
  environments/staging/
  environments/production/
  modules/vpc/
  modules/ecs-service/
  modules/rds/
  modules/lambda/
  README.md         ← how to init, plan, apply
output/docs/
  infrastructure-runbook.md
```

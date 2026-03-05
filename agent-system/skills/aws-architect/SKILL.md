---
name: "aws-architect"
description: "Use for designing, implementing, or reviewing AWS infrastructure. Triggers: \"AWS\", \"S3\", \"EC2\", \"Lambda\", \"RDS\", \"ECS\", \"EKS\", \"VPC\", \"IAM\", \"CloudWatch\", \"CloudFront\", \"Route53\", \"SQS\", \"SNS\", \"API Gateway\", \"cloud architecture\", or any Amazon Web Services task. Always consider cost, security, and high availability."
---


# AWS Architect Skill

Design and implement production AWS infrastructure following the Well-Architected Framework: operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability.

---

## AWS Well-Architected Checklist (run on every design)

```
Security:
  [ ] IAM: least-privilege roles, no root keys in use
  [ ] Resources in private subnets where possible
  [ ] Security groups: deny by default, minimal open ports
  [ ] Encryption at rest (KMS) and in transit (TLS)
  [ ] Secrets in AWS Secrets Manager, not env vars
  [ ] CloudTrail enabled for audit logging
  [ ] GuardDuty enabled for threat detection

Reliability:
  [ ] Multi-AZ deployment for stateful resources
  [ ] Auto Scaling configured with proper health checks
  [ ] RDS Multi-AZ or Aurora for databases
  [ ] S3 versioning for critical data
  [ ] Backup strategy: RTO and RPO defined

Performance:
  [ ] CloudFront CDN for static assets
  [ ] ElastiCache for DB query caching
  [ ] RDS read replicas for read-heavy workloads
  [ ] Right-sized instances (not over-provisioned)

Cost:
  [ ] Reserved Instances or Savings Plans for steady workloads
  [ ] Spot Instances for batch/fault-tolerant workloads
  [ ] S3 lifecycle policies (move to Glacier after 90 days)
  [ ] Cost alerts configured in Billing
  [ ] Unused resources tagged and reviewed
```

---

## VPC Architecture (Standard Production)

```
Region: us-east-1
│
├── VPC: 10.0.0.0/16
│   │
│   ├── Public Subnets (internet-facing)
│   │   ├── 10.0.1.0/24  (AZ: us-east-1a) ← ALB, NAT Gateway
│   │   ├── 10.0.2.0/24  (AZ: us-east-1b) ← ALB, NAT Gateway
│   │   └── 10.0.3.0/24  (AZ: us-east-1c) ← ALB
│   │
│   ├── Private App Subnets (compute)
│   │   ├── 10.0.11.0/24 (AZ: us-east-1a) ← ECS tasks, EC2, Lambda
│   │   ├── 10.0.12.0/24 (AZ: us-east-1b)
│   │   └── 10.0.13.0/24 (AZ: us-east-1c)
│   │
│   └── Private DB Subnets (data tier)
│       ├── 10.0.21.0/24 (AZ: us-east-1a) ← RDS, ElastiCache
│       ├── 10.0.22.0/24 (AZ: us-east-1b)
│       └── 10.0.23.0/24 (AZ: us-east-1c)
│
├── Internet Gateway (IGW)
├── NAT Gateways (one per AZ for HA)
└── VPC Flow Logs → CloudWatch Logs
```

---

## IAM Patterns

```json
// Least-privilege ECS Task Role example
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-app-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:my-app/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/ecs/my-app:*"
    }
  ]
}
```

```bash
# Create role with trust policy for ECS tasks
aws iam create-role \
  --role-name my-app-ecs-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

---

## ECS Fargate (Recommended for containers)

```json
// ECS Task Definition
{
  "family": "my-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789:role/my-app-ecs-task-role",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:latest",
      "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:my-app/db-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/my-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

---

## RDS (PostgreSQL)

```bash
# Production RDS config
aws rds create-db-instance \
  --db-instance-identifier my-app-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version "15.4" \
  --master-username admin \
  --master-user-password "$(aws secretsmanager get-secret-value --secret-id my-app/db-password --query SecretString --output text)" \
  --allocated-storage 100 \
  --max-allocated-storage 1000 \        # Auto-scaling storage
  --storage-type gp3 \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789:key/xxx \
  --db-subnet-group-name my-app-db-subnet-group \
  --vpc-security-group-ids sg-xxx \
  --multi-az \                           # High availability
  --backup-retention-period 7 \
  --deletion-protection \
  --enable-performance-insights \
  --monitoring-interval 60 \
  --enable-cloudwatch-logs-exports '["postgresql","upgrade"]'
```

---

## Lambda (Serverless Functions)

```javascript
// lambda/handler.js — production-ready Lambda
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// Initialize outside handler — reused across warm invocations
let dbConnection = null;
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

async function getSecret(secretName) {
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return JSON.parse(response.SecretString);
}

exports.handler = async (event, context) => {
  // Reuse connection across warm Lambda invocations
  if (!dbConnection) {
    const secrets = await getSecret(process.env.DB_SECRET_NAME);
    dbConnection = await createDbConnection(secrets);
  }

  try {
    const result = await processEvent(event, dbConnection);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': context.awsRequestId,
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error(JSON.stringify({ error: error.message, event }));
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

```json
// Lambda function configuration
{
  "FunctionName": "my-app-processor",
  "Runtime": "nodejs20.x",
  "Handler": "handler.handler",
  "Role": "arn:aws:iam::123456789:role/lambda-execution-role",
  "Timeout": 30,
  "MemorySize": 512,
  "ReservedConcurrentExecutions": 100,
  "Environment": {
    "Variables": {
      "NODE_ENV": "production",
      "DB_SECRET_NAME": "my-app/db-credentials"
    }
  },
  "VpcConfig": {
    "SubnetIds": ["subnet-xxx", "subnet-yyy"],
    "SecurityGroupIds": ["sg-xxx"]
  },
  "TracingConfig": { "Mode": "Active" }
}
```

---

## S3 (Storage)

```bash
# Production S3 bucket with security
aws s3api create-bucket \
  --bucket my-app-uploads \
  --region us-east-1

# Block all public access
aws s3api put-public-access-block \
  --bucket my-app-uploads \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket my-app-uploads \
  --versioning-configuration Status=Enabled

# Lifecycle policy (archive old files)
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-app-uploads \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "archive-old-files",
      "Status": "Enabled",
      "Filter": {"Prefix": "uploads/"},
      "Transitions": [
        {"Days": 90, "StorageClass": "STANDARD_IA"},
        {"Days": 365, "StorageClass": "GLACIER"}
      ],
      "NoncurrentVersionExpiration": {"NoncurrentDays": 30}
    }]
  }'

# Server-side encryption
aws s3api put-bucket-encryption \
  --bucket my-app-uploads \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}}]
  }'
```

---

## CloudWatch Alarms & Alerts

```bash
# CPU alarm for ECS service
aws cloudwatch put-metric-alarm \
  --alarm-name "my-app-high-cpu" \
  --alarm-description "ECS CPU > 80% for 5 minutes" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --dimensions Name=ServiceName,Value=my-app Name=ClusterName,Value=production \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts \
  --ok-actions arn:aws:sns:us-east-1:123456789:alerts

# RDS connection count alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "my-app-db-connections" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --dimensions Name=DBInstanceIdentifier,Value=my-app-db \
  --statistic Average \
  --period 60 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

---

## Cost Estimation Template

```markdown
## AWS Cost Estimate — [Environment]

| Service | Configuration | Est. Monthly |
|---------|--------------|-------------|
| ECS Fargate | 2 tasks × 0.5vCPU × 1GB, 730h | $29 |
| RDS PostgreSQL | db.t3.medium, Multi-AZ, 100GB gp3 | $120 |
| ALB | 1 ALB, ~1M requests | $18 |
| NAT Gateway | 2 AZs, 100GB transfer | $65 |
| S3 | 100GB storage, 1M requests | $5 |
| CloudWatch | Logs 10GB/month, 10 alarms | $8 |
| ECR | 10GB storage | $1 |
| **Total** | | **~$246/month** |

### Cost Reduction Options
- Use single NAT Gateway (saves $32/mo, reduces HA)
- Switch to db.t3.small (saves $60/mo, reduces performance)
- Reserved Instances 1yr (saves ~30% = ~$74/mo)
```

---

## Architecture Decision: Choose the Right Compute

```
Workload type → Recommended service:

Long-running API server     → ECS Fargate (containers, autoscaling)
Event-driven processing     → Lambda (serverless, pay-per-use)
Batch processing            → ECS or Batch + Spot Instances
ML inference                → SageMaker or Lambda with layers
Static website              → S3 + CloudFront (cheapest)
WebSockets / real-time      → API Gateway WebSocket + Lambda
Scheduled jobs              → EventBridge + Lambda
Message queue processing    → SQS + Lambda (automatic scaling)
```

---

## Output Files

```
output/
  infrastructure/
    aws-architecture.md     ← architecture diagram + decisions
    iam-policies/           ← IAM policy JSON files
    task-definitions/       ← ECS task definition JSON
  terraform/                ← see terraform-engineer skill
```

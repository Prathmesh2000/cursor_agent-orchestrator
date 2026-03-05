---
name: "cost-optimizer"
description: "Use when analyzing cloud costs, rightsizing infrastructure, identifying waste, setting budgets, or building cost attribution. Triggers: \"cloud cost\", \"AWS bill\", \"cost optimization\", \"rightsizing\", \"reserved instances\", \"savings plan\", \"budget alert\", \"cost reduction\", \"expensive\", \"overspend\", or when the infrastructure bill is higher than expected."
---


# Cost Optimizer Skill

Systematically reduce cloud spend without degrading reliability. Identify waste, rightsize resources, commit strategically, and establish ongoing cost visibility.

---

## Cost Analysis Process

### Step 1 — Get Baseline

```bash
# AWS Cost Explorer — last 30 days by service
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[0].Groups[*].[Keys[0],Metrics.BlendedCost.Amount]' \
  --output table

# By environment (requires tags)
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=Environment \
  --output table

# Identify top 10 most expensive resources
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '7 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=RESOURCE_ID
```

### Step 2 — Waste Identification Checklist

```bash
# Unused EC2 instances (< 5% CPU for 2 weeks)
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --statistics Average \
  --period 1209600 \
  --dimensions Name=InstanceId,Value=[ID]

# Unattached EBS volumes (paying for storage with nothing using it)
aws ec2 describe-volumes \
  --filters Name=status,Values=available \
  --query 'Volumes[*].[VolumeId,Size,CreateTime]' \
  --output table

# Old snapshots (> 90 days, not referenced)
aws ec2 describe-snapshots --owner-ids self \
  --query 'Snapshots[?StartTime<=`'$(date -d '90 days ago' +%Y-%m-%dT%H:%M:%S)'`].[SnapshotId,StartTime,VolumeSize]' \
  --output table

# Idle RDS instances (< 1 connection for 2 weeks)
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS --metric-name DatabaseConnections \
  --statistics Maximum --period 1209600

# Unused Elastic IPs (charged when not attached)
aws ec2 describe-addresses \
  --query 'Addresses[?!InstanceId].[PublicIp,AllocationId]' \
  --output table

# NAT Gateway data processing cost (often the surprise bill)
aws cloudwatch get-metric-statistics \
  --namespace AWS/NatGateway --metric-name BytesOutToSource \
  --statistics Sum --period 86400
```

---

## Optimization Playbook by Service

### EC2 / ECS Fargate

```
Right-sizing:
  Current: db.r5.4xlarge @ $0.80/hr = $576/month
  If CPU avg < 20%: downsize to db.r5.2xlarge = $288/month → save $288/mo

  Run: AWS Compute Optimizer (free) → recommendations with confidence scores
  Command: aws compute-optimizer get-ec2-instance-recommendations

Spot Instances for non-critical workloads:
  Batch jobs, CI runners, dev environments → 70-90% savings
  ECS Spot: add capacity provider with SPOT strategy
  Interruption handling: checkpointing + SQS for batch jobs

Scheduling:
  Dev/staging environments: shutdown nights + weekends
  Savings: 128h down vs 168h/week = 24% cost reduction
  Use: AWS Instance Scheduler or EventBridge + Lambda
```

### RDS / Databases

```
Right-sizing rule:
  CPU avg < 20% AND memory usage < 50% → downsize one tier
  db.r5.2xlarge → db.r5.xlarge: saves ~$200/month

Aurora Serverless v2 (for variable workloads):
  Scales 0.5-128 ACUs automatically
  Good fit: dev environments, infrequent queries
  Not good fit: steady high-load production

Read Replicas:
  Add read replica to offload analytics/reporting queries
  Cheaper than scaling primary
  Reduces read latency too

Storage:
  gp3 is cheaper than gp2 AND faster — always use gp3
  Migration: modify instance → change storage type (no downtime)
```

### S3

```
Lifecycle policies (biggest S3 savings):
  Standard    → Standard-IA after 30 days  → 45% savings on storage
  Standard-IA → Glacier Instant after 90 days → 68% savings
  Glacier     → Deep Archive after 180 days → 80% savings

Intelligent-Tiering (for unpredictable access):
  Automatically moves objects between tiers
  Good for: logs, backups, archives with variable access
  Cost: $0.0025/1000 objects monitoring fee

Request optimization:
  Use CloudFront in front of S3 → reduces S3 request count + data transfer
  Combine small files before upload → reduces request costs
```

### Data Transfer (often the hidden cost)

```
Data transfer is often 20-40% of AWS bills.

Expensive paths:
  EC2 → Internet: $0.09/GB
  Cross-AZ: $0.01/GB each way (adds up at scale)
  NAT Gateway: $0.045/GB (processes ALL outbound traffic)

Solutions:
  VPC Endpoints: Eliminate NAT costs for S3, DynamoDB, other AWS services
    aws ec2 create-vpc-endpoint --vpc-id vpc-xxx \
      --service-name com.amazonaws.us-east-1.s3 \
      --route-table-ids rtb-xxx
  
  CloudFront: Cache at edge → reduce origin fetches
  Same-AZ traffic: Deploy related services in same AZ
  Data Compression: gzip responses → fewer bytes transferred
```

### Lambda

```
Memory right-sizing:
  More memory = faster = cheaper per invocation (counterintuitive)
  Use AWS Lambda Power Tuning to find optimal:
    https://github.com/alexcasalboni/aws-lambda-power-tuning

Provisioned Concurrency:
  Only for functions with strict cold-start latency requirements
  Calculate: if cold-start > acceptable, provision minimum instances

Arm64 (Graviton2):
  20% cheaper than x86 for same performance
  Change: architecture: arm64 in function config
  Requires: rebuild Docker images for ARM
```

---

## Reserved Instances & Savings Plans

```
Decision guide:

Steady-state workloads (same size, 24/7):
  → EC2 Reserved Instances: 1yr = 40% off, 3yr = 60% off
  → RDS Reserved: similar discounts
  → Commit when: cost history shows consistent usage for 3+ months

Variable workloads (scale up/down):  
  → Compute Savings Plans: flexible, covers EC2 + Fargate + Lambda
  → 1yr no upfront: 20-25% off, 1yr all upfront: 30-35% off

DO NOT commit until:
  ✅ Workload is stable for 3+ months
  ✅ No major architecture changes planned
  ✅ Instance type is right-sized
```

---

## Cost Allocation & Tagging

```bash
# Required tags for all resources (enforce via AWS Config)
Environment: production | staging | dev
Team:        backend | frontend | platform | data
Project:     my-app | billing | auth
CostCenter:  ENG-001

# Enforce tagging via Service Control Policy
aws organizations create-policy \
  --name "require-standard-tags" \
  --type SERVICE_CONTROL_POLICY \
  --content file://require-tags-scp.json

# Cost Explorer: filter by tag to see per-team spend
aws ce get-cost-and-usage \
  --filter '{"Tags": {"Key": "Team", "Values": ["backend"]}}' \
  --group-by Type=TAG,Key=Team
```

---

## Budget Alerts

```bash
# Set budget with alerts before you overspend
aws budgets create-budget \
  --account-id 123456789 \
  --budget '{
    "BudgetName": "monthly-total",
    "BudgetLimit": {"Amount": "500", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "team@company.com"}]
    },
    {
      "Notification": {
        "NotificationType": "FORECASTED",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 100,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "team@company.com"}]
    }
  ]'
```

---

## Cost Optimization Report Template

```markdown
## AWS Cost Optimization Report — [Month Year]

### Current Spend
Total this month: $[X]
vs last month: [+/-]% 
vs budget: [X]% of $[budget]

### Top 5 Services by Cost
| Service | Cost | % of Total | MoM Change |
|---------|------|-----------|------------|
| | | | |

### Waste Found
| Resource | Type | Monthly Waste | Action |
|----------|------|--------------|--------|
| i-xxx | Idle EC2 | $120 | Terminate |
| vol-xxx | Unattached EBS | $15 | Delete |

### Optimization Opportunities
| Action | Effort | Monthly Savings | Risk |
|--------|--------|----------------|------|
| RI purchase: RDS | Low | $200 | Low |
| Rightsize 3 EC2s | Medium | $150 | Low |
| S3 lifecycle policy | Low | $80 | None |
| **Total Potential** | | **$430/mo** | |

### Recommended Next Steps
1. [Action] — owner: [name] — by: [date]
```

---

## Output Files

```
output/docs/
  COST-REPORT-[month].md       ← Monthly analysis
  COST-OPTIMIZATION-PLAN.md    ← Prioritized action list
output/infrastructure/
  budget-alerts.tf             ← Budget alerts as Terraform
  vpc-endpoints.tf             ← VPC endpoints (eliminate NAT cost)
  lifecycle-policies.tf        ← S3 lifecycle rules
```

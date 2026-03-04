---
name: tech-doc-writer
description: Use when creating technical documentation: system design docs, architecture decision records (ADRs), API reference docs, developer guides, runbooks, onboarding guides, or any engineer-facing documentation. Triggers: "tech doc", "technical documentation", "system design doc", "architecture doc", "ADR", "runbook", "developer guide", "API reference", "engineering doc", or Doc: trigger for technical output. Always uses brainstormer to identify audience, scope, and depth before writing.
---

# Tech Doc Writer Skill

Create precise, maintainable technical documentation for engineering audiences. Uses brainstormer to identify audience needs, gaps, and scope before every document — ensuring the right depth and nothing missing.

---

## Brainstorm-First Protocol

```
Before writing any technical doc, brainstorm with these questions:

AUDIENCE:
  - Who is the primary reader? (new engineer, senior, external devs, ops)
  - What do they already know?
  - What decision or task does this doc enable?
  - How often will they reference it vs read once?

SCOPE:
  - What is the minimum a reader needs to know to be unblocked?
  - What is too much detail that should live in code comments?
  - Are there related docs this should link to rather than repeat?

ACCURACY:
  - What parts might become stale fastest?
  - Who owns keeping this up to date?
  - Should it have a "last verified" date?

STRUCTURE:
  - Does the reader need narrative (why) or reference (what)?
  - Should it be a walkthrough or a lookup table?
  - Are there diagrams needed? (architecture, sequence, ERD)
```

---

## Document Templates

### 1. System Design Document

```markdown
# System Design: [System Name]

**Status:**       Proposed | Accepted | Deprecated  
**Authors:**      [names]  
**Last Updated:** [date]  
**Reviewers:**    [names]  

---

## 1. Overview
[2-3 paragraphs: what this system does, why it exists, who uses it]

## 2. Goals
- [Goal 1: measurable outcome]
- [Goal 2]

## 3. Non-Goals
- [What this system intentionally does NOT do]

## 4. Background & Context
[What existed before. What problem created the need. Links to PRD.]

## 5. Architecture

### High-Level Diagram
```
[ASCII or description of components and how they connect]

User → CDN (CloudFront)
     → ALB (Load Balancer)
       → ECS Service (Node.js API)
         → RDS PostgreSQL
         → ElastiCache Redis
         → S3 (file storage)
         → SQS (async jobs)
           → Lambda (job processor)
```

### Component Breakdown
| Component | Purpose | Technology | Owner |
|-----------|---------|------------|-------|
| API Service | Handle HTTP requests | Node.js + Express | Backend team |
| Database | Persistent storage | PostgreSQL 15 | Backend team |
| Cache | Session + query cache | Redis 7 | Backend team |
| Job Queue | Async processing | SQS + Lambda | Backend team |

### Data Flow
1. Request enters via CloudFront (cached static assets)
2. Dynamic requests route to ALB → ECS service
3. ECS checks Redis cache first
4. Cache miss → query PostgreSQL
5. Heavy operations enqueued to SQS
6. Lambda processes queue asynchronously

## 6. Data Model
[Key entities and relationships — or link to ERD]

### Core Entities
| Entity | Description | Key Fields |
|--------|-------------|-----------|
| User | Authenticated user | id, email, role, created_at |
| [Entity] | [what it is] | [important fields] |

### Key Relationships
- User has many Projects (owner)
- Project has many Tasks
- Task belongs to User (assignee)

## 7. API Design
[Key endpoints or link to API reference]

### Endpoint Overview
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | /api/auth/login | Authenticate user | None |
| GET | /api/projects | List user's projects | JWT |
| POST | /api/projects | Create project | JWT |

## 8. Key Design Decisions
[What was chosen and why — brief, link to ADRs for detail]
- Used PostgreSQL over MongoDB: relational data, ACID needed (ADR-003)
- Queue-based async processing: isolates failures, enables retry (ADR-007)

## 9. Security Considerations
- Authentication: JWT with 15-min access tokens + 7-day refresh
- Authorization: role-based (admin / user / guest)
- Data: encrypted at rest (AWS KMS), in transit (TLS 1.3)
- Secrets: AWS Secrets Manager, never in env vars
- OWASP Top 10: addressed (see security-report.md)

## 10. Performance Characteristics
| Metric | Target | Current Baseline |
|--------|--------|-----------------|
| p95 API latency | < 200ms | 145ms |
| Throughput | 500 req/s | 320 req/s |
| DB queries/request | < 5 | 3.2 avg |

## 11. Scalability
- Horizontal scaling: ECS auto-scales 2-20 tasks on CPU > 70%
- DB scaling: read replicas for read-heavy workloads
- Cache: Redis reduces DB load by ~60%
- Bottleneck: PostgreSQL writes at very high volume → consider write queue

## 12. Failure Modes & Resilience
| Failure | Impact | Mitigation |
|---------|--------|-----------|
| ECS task crash | Request fails | ECS restarts task, ALB health check removes unhealthy tasks |
| RDS failover | ~30s downtime | Multi-AZ automatic failover |
| Redis unavailable | Higher DB load | App falls back to DB queries |
| SQS consumer down | Queue backlog | Messages retained 14 days, Lambda retries 3x |

## 13. Monitoring
- Dashboards: CloudWatch → link to dashboard
- Alerts: CPU > 80%, error rate > 1%, latency p95 > 500ms
- Logs: /aws/ecs/my-app in CloudWatch Logs
- Tracing: X-Ray for request traces

## 14. Local Development Setup
See: [link to CONTRIBUTING.md or onboarding guide]

## 15. Open Questions
- [ ] [question] — owner: [name] — deadline: [date]
```

---

### 2. Architecture Decision Record (ADR)

```markdown
# ADR-[NNN]: [Decision Title]

**Date:**    [date]  
**Status:**  Proposed | Accepted | Deprecated | Superseded by ADR-[N]  
**Deciders:** [names]  
**Tags:**    [database | auth | infrastructure | api | frontend]  

---

## Context
[What situation, constraint, or requirement forced this decision?
What is the problem we are solving?
What forces are at play? (technical, business, team, time)]

## Decision
**We will [chosen approach].**

[2-3 sentence explanation of exactly what was decided]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative (accepted tradeoffs)
- [Tradeoff 1 — and why we accept it]
- [Tradeoff 2]

### Neutral
- [Side effect that's neither good nor bad]

## Alternatives Considered

### Option A: [Name] ← (what we chose)
[Description]
Pros: [list] | Cons: [list]

### Option B: [Name] ← (rejected)
[Description]
Pros: [list] | Cons: [list]
Rejected because: [specific reason]

### Option C: [Name] ← (rejected)
[Description]
Rejected because: [specific reason]

## References
- [Link to research, RFC, related PRD, or other ADRs]
```

---

### 3. Runbook

```markdown
# Runbook: [System/Process Name]

**Last Verified:** [date]  
**Owner:**         [team or person]  
**On-Call:**       [Slack channel or PagerDuty rotation]  
**Severity:**      P1 (customer impact) | P2 (degraded) | P3 (minor)  

---

## Overview
[What this runbook is for. When to use it.]

## Prerequisites
- [ ] Access to [AWS Console / Kubernetes / DB]
- [ ] [Tool] installed: `brew install [tool]`
- [ ] Credentials: [where to get them]

## Monitoring & Alerts
| Alert | Threshold | Dashboard | Likely Cause |
|-------|-----------|-----------|-------------|
| High CPU | > 80% 5min | [link] | Traffic spike or memory leak |
| Error rate spike | > 5% | [link] | Deploy failure or dependency down |
| DB connections | > 80% max | [link] | Connection pool exhausted |

## Symptoms → Actions

### Service is down (5xx errors)
```bash
# 1. Check service health
aws ecs describe-services --cluster production --services my-app

# 2. Check recent deployments
aws ecs list-tasks --cluster production --service-name my-app

# 3. View logs
aws logs get-log-events \
  --log-group-name /ecs/my-app \
  --log-stream-name ecs/app/[task-id] \
  --start-time $(date -d '30 minutes ago' +%s000)

# 4. If deployment caused it — rollback
aws ecs update-service \
  --cluster production \
  --service my-app \
  --task-definition my-app:[previous-revision]
```

### Database connection errors
```bash
# 1. Check RDS status
aws rds describe-db-instances --db-instance-identifier my-app-db

# 2. Check connection count
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=my-app-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 --statistics Average

# 3. Kill long-running queries (if connections exhausted)
# Connect to DB then:
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 minutes';
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = [pid];
```

## Escalation
1. < 15 min: Own resolution
2. 15-30 min: Page [backup on-call]
3. > 30 min: Escalate to [engineering manager]

## Post-Incident
- [ ] Write incident report within 48h
- [ ] Root cause identified
- [ ] Action items created in backlog
- [ ] Runbook updated with new learnings
```

---

### 4. Developer Onboarding Guide

```markdown
# Developer Onboarding: [Project Name]

**Reading time:** ~30 minutes  
**Last Updated:** [date]  

---

## What Is This System?
[1-paragraph plain English description. What it does, who uses it.]

## Repository Structure
```
/
├── src/
│   ├── api/          ← REST endpoints
│   ├── services/     ← Business logic
│   ├── models/       ← Database models
│   └── utils/        ← Shared utilities
├── tests/
├── infrastructure/   ← Terraform IaC
├── .github/          ← CI/CD pipelines
└── docs/             ← Additional documentation
```

## Local Setup (< 15 minutes)
```bash
# Prerequisites: Node 20+, Docker, psql client
git clone [repo-url] && cd [project]
cp .env.example .env          # fill in values from 1Password: "Dev Credentials"
npm install
docker compose up -d          # starts postgres + redis locally
npm run db:migrate
npm run db:seed               # optional: sample data
npm run dev                   # starts on http://localhost:3000
```

## Environment Variables Reference
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DATABASE_URL | Yes | Postgres connection | postgresql://... |
| JWT_SECRET | Yes | Token signing key | get from 1Password |
| REDIS_URL | Yes | Redis connection | redis://localhost:6379 |

## Running Tests
```bash
npm test              # all tests
npm run test:unit     # unit tests only (fast)
npm run test:int      # integration (needs Docker)
npm run test:e2e      # E2E (needs running server)
npm run test:cov      # with coverage report
```

## Key Concepts
[2-3 short sections explaining the non-obvious design decisions]

## Common Tasks
- Add a new API endpoint → see [link]
- Add a database migration → `npm run migration:create -- --name add-column`
- Deploy to staging → merge to `main`
- Deploy to production → create a release tag

## Where to Get Help
- Slack: #[channel]
- Architecture questions: @[tech lead]
- On-call: see PagerDuty
```

---

## Writing Principles for Technical Docs

```
1. AUDIENCE FIRST: Write for a competent engineer who is new to this system.
   Not a beginner, not an expert in this codebase.

2. SCANNABLE: Engineers search, not read linearly.
   Use headers, tables, code blocks, and short paragraphs.

3. EXECUTABLE: Every command must be copy-paste runnable.
   Test every code example before publishing.

4. LINK DON'T REPEAT: If it's in another doc, link to it.
   Duplication creates maintenance debt.

5. DATE EVERY DOC: "Last verified [date]" shows if it's stale.

6. EXPLAIN WHY, NOT JUST WHAT: Code explains what. Docs explain why.
   "We chose X because Y" is more valuable than "We use X".
```

---

## Output Files

```
output/docs/
  DESIGN-[system].md            ← System Design Doc
  ADR-[NNN]-[decision].md       ← Architecture Decision Record
  RUNBOOK-[system]-[issue].md   ← Operational runbook
  ONBOARDING.md                 ← Developer onboarding guide
  API-REFERENCE-[service].md    ← API reference
```

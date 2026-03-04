# ⚡ QUICK REFERENCE v4.0 — 32 Skills · 28 Agents · 20 Triggers

---

## 20 Triggers

| Trigger | Agent(s) | Key Skills |
|---|---|---|
| `Planner: [task]` | Product Manager | `task-planner` |
| `Bug: [desc]` | Debugger | `debugger` |
| `Workflow: [task]` | Full team | all |
| `Test: [target]` | QA Lead | `unit-test-writer` `integration-test-writer` `e2e-test-writer` `performance-tester` `accessibility-tester` |
| `DevOps: [task]` | DevOps Engineer | `devops-engineer` `ci-cd-pipeline` |
| `Git: [task]` | Release Manager | `git-workflow` |
| `MCP: [task]` | MCP Engineer | `mcp-builder` `mcp-integrator` |
| `Release: [ver]` | Release Manager | `git-workflow` `ci-cd-pipeline` `changelog-writer` |
| `Infra: [task]` | AWS Architect + Infra Eng | `aws-architect` `terraform-engineer` `cost-optimizer` `diagram-writer` |
| `Doc: tech [topic]` | Technical Writer | `tech-doc-writer` `brainstormer` `diagram-writer` |
| `Doc: functional [topic]` | Functional Analyst | `functional-doc-writer` `brainstormer` `diagram-writer` |
| `Doc: diagram [topic]` | Technical Writer | `diagram-writer` |
| `Observe: [task]` | Observability Eng | `observability-engineer` `incident-manager` |
| `Incident: [desc]` | Incident Commander | `incident-manager` `debugger` `observability-engineer` |
| `Data: [task]` | Data Engineer | `data-pipeline` `schema-designer` `db-manager` |
| `Research: [topic]` | Researcher | `researcher` `brainstormer` |
| `Prompt: [task]` | Prompt Engineer | `prompt-writer` `token-analyzer` |
| `AI: [task]` | AI Engineer | `prompt-writer` `token-analyzer` `ml-engineer` |
| `ML: [task]` | ML Engineer | `ml-engineer` `researcher` |
| `API: [task]` | API Design Lead | `api-generator` `api-contract-tester` `api-versioning` |
| `Monorepo: [task]` | Platform Engineer | `monorepo-manager` `ci-cd-pipeline` |
| `Review: [target]` | Code Reviewer + Security | `code-reviewer` `security-analyst` |

---

## 32 Skills

| Skill | Category | Use For |
|---|---|---|
| `api-contract-tester` | Testing | Consumer-driven contract tests |
| `api-generator` | Backend | REST endpoints, Swagger, route handlers |
| `api-versioning` | Backend | v2 strategy, deprecation, breaking changes |
| `aws-architect` | Cloud | VPC, ECS, RDS, Lambda, IAM, Well-Architected |
| `accessibility-tester` | Testing | WCAG 2.1 AA, axe-core, keyboard nav |
| `brainstormer` | Core | Approach exploration, design decisions |
| `changelog-writer` | Release | CHANGELOG.md, release notes, migration guides |
| `ci-cd-pipeline` | DevOps | GitHub Actions, deploy pipelines, rollback |
| `code-migrator` | Engineering | Code migration, upgrade paths |
| `code-reviewer` | Quality | PR review, quality gates |
| `content-writer` | Frontend | UI copy, errors, CTAs, onboarding |
| `cost-optimizer` | Cloud | AWS/infra cost reduction strategies |
| `cto-orchestrator` | Core | Architecture, escalations, strategy |
| `data-pipeline` | Data | ETL, batch, streaming, data quality |
| `db-manager` | Backend | PostgreSQL, Sequelize, migrations, queries |
| `debugger` | Core | RCA, bug analysis, fix options |
| `devops-engineer` | DevOps | Docker, K8s, monitoring, prod ops |
| `diagram-writer` | Docs | Mermaid: architecture, sequence, ERD, C4 |
| `document-expert` | Docs | Doc review and audit |
| `e2e-test-writer` | Testing | Playwright E2E, user journey tests |
| `error-handler` | Engineering | Error handling patterns, error catalog |
| `feature-flags` | Engineering | Feature flag strategy and implementation |
| `frontend-implementer` | Frontend | React, hooks, components, forms |
| `functional-doc-writer` | Docs | Functional specs, BRDs, process flows |
| `git-workflow` | DevOps | Branching, commits, PRs, releases |
| `integration-test-writer` | Testing | API+DB integration tests |
| `mcp-builder` | AI/MCP | Build MCP servers from scratch |
| `mcp-integrator` | AI/MCP | Connect and configure MCP clients |
| `ml-engineer` | AI/ML | RAG, fine-tuning, eval, MLOps |
| `monorepo-manager` | Platform | Turborepo, pnpm workspaces, shared packages |
| `observability-engineer` | DevOps | Logging, tracing, metrics, SLOs |
| `performance-tester` | Testing | k6 load tests, Lighthouse, profiling |
| `prompt-writer` | AI | System prompts, few-shot, chain-of-thought |
| `researcher` | Core | Tech comparison, feasibility, RnD |
| `schema-designer` | Data | DB schema, data modeling |
| `security-analyst` | Security | OWASP, threat model, pen test |
| `task-planner` | Core | Task breakdown, sprint planning |
| `tech-doc-writer` | Docs | System design, ADRs, runbooks, API ref |
| `terraform-engineer` | Cloud | Terraform modules, state, environments |
| `token-analyzer` | AI | Token cost, context management |
| `uiux-designer` | Frontend | Mockups, flows, design specs |
| `unit-test-writer` | Testing | Jest/pytest unit tests, coverage |

---

## 28 Agents

| Agent | Trigger | Skills |
|---|---|---|
| CTO | escalations | `cto-orchestrator` |
| Product Manager | Planner: · Phase 10 | `task-planner` |
| UI/UX Designer | Phase 2 | `uiux-designer` |
| Content Writer | Phase 2 | `content-writer` |
| Senior Engineer | complex tasks | all |
| Junior Engineer | CRUD tasks | `api-generator` `frontend-implementer` `db-manager` |
| Security Analyst | Phase 3 + Review: | `security-analyst` |
| Code Reviewer | Phase 5 every task | `code-reviewer` |
| Debugger | Bug: | `debugger` |
| Document Expert | docs review | `document-expert` |
| QA Lead | Test: · Phase 6 | all test skills |
| Test Agent | Phase 5+7 | runs tests |
| End Consumer | Phase 11 | user feedback |
| AI Engineer | AI: | `prompt-writer` `token-analyzer` `ml-engineer` |
| ML Engineer | ML: | `ml-engineer` `researcher` |
| Researcher | Research: | `researcher` `brainstormer` |
| Prompt Engineer | Prompt: | `prompt-writer` `token-analyzer` |
| DevOps Engineer | DevOps: | `devops-engineer` `ci-cd-pipeline` |
| MCP Engineer | MCP: | `mcp-builder` `mcp-integrator` |
| Release Manager | Release: Git: | `git-workflow` `ci-cd-pipeline` `changelog-writer` |
| **AWS Architect** | Infra: aws | `aws-architect` `terraform-engineer` `cost-optimizer` |
| **Infra Engineer** | Infra: terraform | `terraform-engineer` `ci-cd-pipeline` |
| **Technical Writer** | Doc: tech | `tech-doc-writer` `brainstormer` `diagram-writer` |
| **Functional Analyst** | Doc: functional | `functional-doc-writer` `brainstormer` `diagram-writer` |
| **Observability Eng.** | Observe: | `observability-engineer` `incident-manager` |
| **Incident Commander** | Incident: | `incident-manager` `debugger` |
| **Data Engineer** | Data: | `data-pipeline` `schema-designer` `db-manager` |
| **API Design Lead** | API: | `api-generator` `api-contract-tester` `api-versioning` |
| **Platform Engineer** | Monorepo: | `monorepo-manager` `ci-cd-pipeline` |

---

## Workflow: 12 Phases

| Phase | Agent | User Gate |
|---|---|---|
| 0 Input | — | Collect PRD + constraints |
| 1 Brainstorm | Brainstormer+CTO | Pick approach A/B/C |
| 2 UI/UX | Designer+Writer | Confirm design |
| 3 Security | Security Analyst | Confirm risks+reqs |
| 4 Tasks | Task Planner | Confirm board |
| 5 Engineering | Engineers+Tests | Per-task loop (6 steps) |
| 6 QA Review | QA Lead | Coverage check |
| 7 E2E | Test Agent | Clean run |
| 8 A11y | QA Lead | WCAG 2.1 AA |
| 9 Performance | QA Lead | SLA met |
| 10 PM Sign-off | PM | Requirements met |
| 11 User Feedback | End Consumer | Satisfied |
| 12 Docs | Tech Writer | System doc + changelog |

---

## Infra Workflow (Trigger: Infra:)

| Phase | Agent | Gate |
|---|---|---|
| 1 Design | AWS Architect+Brainstormer | Approve architecture + cost |
| 2 Security | Security Analyst | Approve IAM + network |
| 3 Terraform | Infra Engineer | Approve module structure |
| 4 CI/CD | DevOps Engineer | Approve infra pipeline |
| 5 Runbook | Technical Writer | Ops doc complete |

---

## Doc Workflow (Trigger: Doc:)

Both types MANDATORY run Brainstormer first:
  → surface gaps, assumptions, audience, structure needs
  → CONFIRM before writing

tech → System design · ADR · Runbook · API reference · Dev guide
functional → Functional spec · BRD · Use cases · Process flows
diagram → Architecture · Sequence · ERD · Flowchart · C4

---

## Quality Gates

| Gate | Criteria | Phase |
|---|---|---|
| Unit tests | ≥80% lines, ≥75% branches | 5 per task |
| Code review | 0 critical issues | 5 per task |
| Integration | All API+DB paths covered | 5 per task |
| E2E | All user journeys pass | 7 |
| A11y | WCAG 2.1 AA (0 critical) | 8 |
| Performance | p95<500ms, errors<1% | 9 |
| PM sign-off | All PRD requirements met | 10 |
| User feedback | User satisfied | 11 |
| Docs | System doc + changelog updated | 12 |

---

## Tech Stack

Backend: Node.js · Express · PostgreSQL · Sequelize
Frontend: React · Tailwind · React Router
Auth: JWT · Bcrypt
Testing: Jest · RTL · Playwright · k6 · axe-core
Cloud: AWS (ECS/RDS/S3/Lambda/CloudFront/Route53)
IaC: Terraform + S3 remote state
DevOps: Docker · GitHub Actions · Kubernetes
AI/ML: Anthropic SDK · OpenAI SDK · LangChain · ChromaDB
MCP: @modelcontextprotocol/sdk
Monorepo: Turborepo + pnpm workspaces

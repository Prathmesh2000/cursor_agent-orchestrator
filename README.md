# CTO Agent Orchestrator

**A multi-agent system that runs like a CTO-led engineering org:** 48+ specialized agents, 77+ skills, and a full feature lifecycle from PRD to merged PR—with quality gates, brownfield support, and commit-after-every-atomic-unit discipline.

---

## What it does

- **Orchestrates a full feature workflow:** Requirements (PM + Brainstormer) → UX design (UI/UX Designer, 3-round interview) → Technical design (HLD/LLD) → Security review → Task-by-task implementation → Tests (unit, integration, E2E, a11y, perf) → PM sign-off → Docs.
- **48 agent roles** including CTO, Product Manager, UI/UX Designer, Content Writer, Senior/Junior Engineer, Security Analyst, Code Reviewer, QA Lead, DevOps, AWS Architect, Terraform Engineer, DDD Architect, Microservice Architect, Observability Engineer, Incident Commander, AI/ML Engineers, MCP Engineer, and more.
- **77+ skills** covering API design, auth, caching, resilience, event storming, monolith decomposition, contract testing, distributed tracing, and domain-driven design.
- **Brownfield-first:** Codebase Intelligence and Pattern Compliance agents explore existing repos, extract patterns, and keep new code in sync before any implementation.
- **Quality gates:** Security (OWASP), accessibility (WCAG 2.1 AA), performance (e.g. p95 &lt; 500ms), test coverage (e.g. ≥80%), and commit-per-atomic-unit so every commit is a safe revert point.

---

## Repository structure

| Path | Purpose |
|------|--------|
| `agent-system/` | Core orchestration, agents, and workflow definitions |
| `agent-system/AGENTS.md` | All 48 agent definitions, capabilities, and escalation paths |
| `agent-system/ORCHESTRATOR.md` | Trigger→agent map, phases, commit rules |
| `agent-system/QUICK_REFERENCE.md` | Triggers, skills, and agents at a glance |
| `agent-system/WORK_MANAGER.md` | Full feature lifecycle and task loop |
| `agent-system/skills/` | Skill definitions (e.g. `cto-orchestrator`, `microservice-architect`, `aws-architect`) |

---

## Triggers (how you run it)

Trigger phrases drive which agents run. Examples:

| Trigger | Agents / Use |
|--------|----------------|
| `Workflow: [feature]` | Full lifecycle (PRD → design → build → test → docs) |
| `Planner: [task]` | Product Manager + task breakdown |
| `HLD:` / `LLD:` | High-level / low-level design |
| `Micro:` / `Decompose:` | Microservice architecture / monolith decomposition |
| `DDD:` / `EventStorm:` | Domain-driven design / event storming |
| `Infra: aws` / `Infra: terraform` | AWS Architect / Terraform Engineer |
| `Test:` / `Review:` | QA Lead / Code Reviewer + Security |
| `Bug: [desc]` | Debugger → Engineer |
| `Doc: tech` / `Doc: functional` | Technical / functional documentation |

See `agent-system/QUICK_REFERENCE.md` for the full trigger list.

---

## Tech stack (reference)

The orchestration and skills are stack-agnostic; the reference stack in the docs includes:

- **Backend:** Node.js, Express, PostgreSQL, Sequelize  
- **Frontend:** React, Tailwind, React Router  
- **Auth:** JWT, Bcrypt  
- **Testing:** Jest, RTL, Playwright, k6, axe-core  
- **Cloud:** AWS (ECS, RDS, S3, Lambda, CloudFront, Route53)  
- **IaC:** Terraform, S3 remote state  
- **DevOps:** Docker, GitHub Actions, Kubernetes  
- **AI/ML:** Anthropic/OpenAI SDKs, LangChain, ChromaDB  
- **MCP:** Model Context Protocol  
- **Monorepo:** Turborepo, pnpm workspaces  

---

## Who this is for

- **CTOs / Tech leads** who want a repeatable, quality-gated process for features.
- **Teams** adopting AI-assisted development and wanting structure (PRDs, security, tests, docs).
- **Engineers** working in existing codebases who want pattern compliance and brownfield support.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

Contributions are welcome: new skills, agent refinements, or workflow improvements. Open an issue or PR with a clear scope and follow the commit conventions in `agent-system/ORCHESTRATOR.md` (conventional commits, one atomic unit per commit).

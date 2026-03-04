# Detailed usage guide

How to use this skill and agent workflow inside **Cursor** to get better, consistent, quality results. This repo is not an app—it’s reference material you use in prompts and (optionally) Cursor rules.

---

## 1. What you have

- **48 agent roles** — e.g. Product Manager, UI/UX Designer, Senior/Junior Engineer, Security Analyst, DevOps, AWS Architect, DDD Architect. Each has a defined scope and behavior.
- **77+ skills** — e.g. `api-generator`, `security-analyst`, `db-manager`, `frontend-implementer`. Skills are the “how” behind each agent.
- **Triggers** — Short phrases you type in chat (e.g. `Workflow: add login`) so Cursor applies the right workflow and agent behavior.
- **Workflow phases** — A repeatable flow: requirements → design → security → implementation → tests → docs.

You use these by **referencing them in Cursor**: in the chat prompt, in project rules, or in a `.cursor/rules` file.

---

## 2. Setup (one-time)

### Option A — Use as reference (no install)

1. Clone or download this repo (or keep it open in another window).
2. When you want a structured response, start your Cursor prompt with a **trigger** and, if needed, point at the right doc:
   - *“Workflow: add user login with JWT”*
   - *“Following agent-system/AGENTS.md and QUICK_REFERENCE.md, act as Security Analyst and review this auth code.”*

No installation; you’re just using the repo as documentation.

### Option B — Add to your project (recommended for teams)

1. Clone this repo next to your project or as a subfolder, e.g. `my-app/cursor-workflow/`.
2. In your project, add a **Cursor rule** that loads this workflow:
   - Create or edit `.cursor/rules` (or project Rules in Cursor settings).
   - Add a rule that says: when the user uses triggers like `Workflow:`, `Planner:`, `Bug:`, etc., follow the definitions and phases in `cursor-workflow/agent-system/` (or the path where you put this repo).
3. Optionally paste the **trigger list** (from section 4 below) into a rule so Cursor knows the trigger keywords.

After that, use triggers in Cursor chat as in section 3.

---

## 3. How to use triggers in Cursor

Triggers are **keywords you type at the start of your request**. They tell Cursor which workflow or agent to use.

### Examples

| You type in Cursor | What Cursor should do |
|--------------------|------------------------|
| `Workflow: add user authentication with JWT` | Run the full flow: requirements → design → security → tasks → implementation → tests → docs. |
| `Planner: break down "export to PDF" into tasks` | Act as Product Manager + Task Planner; output a task list with sizes and owners. |
| `Bug: login fails with 401 after 15 minutes` | Act as Debugger: gather context, hypotheses, root cause, fix options. |
| `HLD: design a notification service` | Act as HLD Architect: context diagram, services, tech choices, ADRs. |
| `LLD: implement the auth module from the HLD` | Act as LLD Designer: classes, DB schema, sequences, test plan. |
| `Infra: aws set up ECS + RDS for this app` | Act as AWS Architect + Terraform: architecture, Terraform, cost. |
| `Doc: tech runbook for deployment` | Act as Technical Writer: runbook with steps, rollback, owners. |
| `Test: add E2E for checkout flow` | Act as QA Lead: E2E test plan and Playwright-style tests. |
| `Review: review this PR for security and style` | Act as Code Reviewer + Security Analyst: checklist, issues, suggestions. |
| `DDD: event storm the order flow` | Act as DDD Architect: event storming, bounded contexts, aggregates. |
| `Micro: decompose this monolith into services` | Act as Microservice Architect: boundaries, APIs, events. |

### Tips

- **Be specific after the trigger.**  
  Good: `Workflow: add password reset via email`  
  Vague: `Workflow: fix auth`

- **One workflow per request.**  
  Use one main trigger per message (e.g. one `Workflow:` or one `Planner:`). For another phase, send a follow-up with the right trigger.

- **Existing codebase?**  
  Say so: *“We’re in an existing repo; follow brownfield workflow and match existing patterns.”* Cursor will use the Codebase Intelligence and Pattern Compliance behavior from this workflow.

---

## 4. Full trigger list

Use these at the start of a Cursor prompt. Details and agent mappings are in `agent-system/QUICK_REFERENCE.md` and `agent-system/ORCHESTRATOR.md`.

| Trigger | Use for |
|--------|--------|
| `Workflow: [feature]` | Full lifecycle (PRD → design → build → test → docs). |
| `Planner: [task]` | Task breakdown and sprint-style planning. |
| `Bug: [description]` | Debugging and root-cause analysis. |
| `HLD:` | High-level design (system, services, tech choices). |
| `LLD:` | Low-level design (modules, DB, APIs, sequences). |
| `Micro:` | Microservice boundaries and decomposition. |
| `Decompose:` | Monolith → microservices strategy. |
| `DDD:` / `EventStorm:` | Domain-driven design, event storming. |
| `Contract:` | API/event contracts and versioning. |
| `Infra: aws` / `Infra: terraform` | AWS architecture, Terraform, cost. |
| `Test:` | Unit, integration, E2E, performance, accessibility. |
| `Review:` | Code review + security check. |
| `Doc: tech [topic]` | Technical docs (runbooks, ADRs, API ref). |
| `Doc: functional [topic]` | Functional specs, BRDs, process flows. |
| `Doc: diagram [topic]` | Architecture, sequence, ERD diagrams. |
| `DevOps: [task]` | CI/CD, Docker, K8s, environments. |
| `Release: [version]` | Versioning, changelog, release steps. |
| `Observe: [task]` | Logging, metrics, tracing, SLOs. |
| `Incident: [desc]` | Incident handling, RCA, post-mortem. |
| `Data: [task]` | Data pipelines, ETL, schemas. |
| `Research: [topic]` | Tech comparison, feasibility. |
| `Prompt: [task]` | Prompt design and optimization. |
| `AI: [task]` | AI/LLM integration and pipelines. |
| `ML: [task]` | ML pipelines, RAG, fine-tuning. |
| `API: [task]` | API design, versioning, contract tests. |
| `Monorepo: [task]` | Monorepo setup, shared packages. |
| `MCP: [task]` | MCP server or client setup. |
| `Auth: [task]` | Auth, JWT, OAuth, RBAC. |
| `Realtime: [task]` | WebSockets, SSE, real-time features. |
| `Search: [task]` | Search and indexing. |
| `Design:` | UI/UX and design system. |
| `Explore:` | Understand existing codebase and patterns. |
| `Sync:` | Check new code against existing patterns. |

---

## 5. Workflow phases (when you use `Workflow:`)

When you use **Workflow: [feature]**, Cursor should follow this high-level flow. You can run it in one long conversation or step by step.

| Phase | What happens |
|-------|----------------|
| 0 | Collect requirements and constraints (PRD-style). |
| 1 | Brainstorm 2–3 approaches; you pick one. |
| 2 | UX design (if UI): flows, screens, states, design tokens. |
| 3 | Security review: risks, OWASP, mitigations. |
| 4 | Task breakdown: list of tasks with sizes and owners (Junior/Senior). |
| 5 | Implementation: implement task by task; each unit has tests and review. |
| 6 | QA: coverage, integration, E2E. |
| 7 | E2E pass. |
| 8 | Accessibility (WCAG 2.1 AA). |
| 9 | Performance (e.g. p95, error rate). |
| 10 | PM sign-off: requirements met. |
| 11 | User feedback simulation. |
| 12 | Documentation and changelog. |

You can say e.g. *“We’re at phase 4, here’s the task list; implement task 1 and 2”* to jump to a specific phase.

---

## 6. Referencing agents and skills in prompts

You can call out an agent or skill explicitly when you don’t use a trigger:

- *“Act as Security Analyst (agent-system/AGENTS.md). Review this login code for OWASP issues.”*
- *“Using the api-generator and db-manager skills (agent-system/skills/), add a GET /users endpoint with pagination.”*
- *“Follow the frontend-implementer skill: React, hooks, existing design tokens.”*

Pointing at `AGENTS.md` or a specific skill under `agent-system/skills/` helps Cursor stay consistent with this workflow.

---

## 7. Brownfield (existing codebase)

For existing repos:

1. Start with **Explore:** or say *“This is an existing repo; run the brownfield workflow.”*
2. Cursor should (by the definitions in this repo):
   - Explore structure and entry points.
   - Extract patterns (naming, layers, error handling).
   - Produce a short “pattern card” or conventions.
3. Then use **Workflow:** or other triggers; ask Cursor to *“follow the pattern card and existing conventions.”*
4. Use **Sync:** (or ask for a “sync check”) to compare new code to existing patterns before you commit.

---

## 8. Quality and commits

The workflow encourages:

- **Quality gates:** Security (OWASP), accessibility (WCAG 2.1 AA), test coverage (e.g. ≥80% lines, ≥75% branches), performance (e.g. p95 &lt; 500ms).
- **Conventional commits:** e.g. `feat(auth): add login endpoint`, `fix(ui): correct error message`. One logical change per commit.
- **Commit per atomic unit:** one model, one endpoint, one component, one test file—so each commit is a safe revert point.

You can say: *“Follow the commit rules in agent-system/ORCHESTRATOR.md: one atomic unit per commit, conventional commit messages.”*

---

## 9. Where to read more

| File | Content |
|------|--------|
| `README.md` | Overview and repo structure. |
| `agent-system/QUICK_REFERENCE.md` | Triggers, skills, agents, quality gates, tech stack. |
| `agent-system/AGENTS.md` | All 48 agents: role, capabilities, when they’re used, escalation. |
| `agent-system/ORCHESTRATOR.md` | Trigger→agent map, commit rules, phases. |
| `agent-system/WORK_MANAGER.md` | Full feature lifecycle and task loop. |
| `agent-system/skills/*/SKILL.md` | Per-skill instructions (e.g. how to implement auth, APIs, tests). |

Use this guide to get started; use the table above when you need more detail or a specific agent/skill.

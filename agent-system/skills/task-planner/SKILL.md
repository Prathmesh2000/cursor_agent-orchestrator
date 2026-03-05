---
name: "task-planner"
description: "Use when breaking down a high-level task, JIRA ticket, feature request, or PRD into granular, actionable subtasks. Triggers: \"break down\", \"plan this\", \"JIRA\", \"what are the steps\", sprint planning, or before any complex implementation."
---


# Task Planner Skill

Transform requirements into granular, well-sequenced tasks that engineers can execute independently.

---

## Sizing

| Size | Hours | Description |
|---|---|---|
| S | 1–3h | Single file, clear scope |
| M | 3–8h | Multiple files, some complexity |
| L | 8h+ | Too large → break down further |

Rule: No L tasks in the final breakdown. Decompose until all tasks are S or M.

---

## Task Template

```markdown
## [COMPONENT-###] [Clear, actionable title]

Description: [What needs to be done in 2–3 sentences]

Acceptance Criteria:
- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]

Files: [files to create or modify]
Size: S | M
Assignee: Junior | Senior
Dependencies: [IDs that must be done first]
Blocks: [IDs that need this done first]

Tests:
- Unit: [what to test]
- Integration: [what to test]
- Manual: [what to verify]

Risks: [gotchas or potential issues]
```

---

## Component Groupings

Organize tasks by component:

```
Backend (BE-xxx):   API endpoints, business logic, middleware
Frontend (FE-xxx):  React components, hooks, routing
Database (DB-xxx):  Models, migrations, queries, indexes
Security (SEC-xxx): Auth, rate limiting, validation, CSRF
Testing (TEST-xxx): Unit tests, integration tests, E2E
Docs (DOC-xxx):     API docs, README, code comments
```

---

## Dependency Graph (Required)

Always produce a visual dependency map:

```
DB-001 Create schema
    ↓
BE-001 Auth API endpoints ─────────────────────────┐
    ↓                                               │
FE-001 Login form         FE-002 Signup form       │
    ↓                         ↓                    │
    └──────────────► TEST-001 Integration tests ◄──┘
                              ↓
                         PM Sign-off
```

---

## Sprint Plan Output

```markdown
## Sprint 1: [Goal] (Week 1)
Must Have (P0):
- [DB-001] Task name (3h) — @senior
- [BE-001] Task name (5h) — @senior

Should Have (P1):
- [FE-001] Task name (4h) — @junior

Total: [Xh] | Junior: [Xh] | Senior: [Xh]
```

---

## Full Output Structure

1. **Executive Summary** — total tasks, effort, timeline, top 3 risks
2. **Task List** — all tasks by component using template above
3. **Dependency Graph** — visual map
4. **Sprint Plan** — grouped by iteration
5. **Open Questions** — ambiguities needing PM/CTO decision

---

## Assignment Rules

| Task Type | Assign To |
|---|---|
| CRUD endpoints, basic forms, unit tests | Junior |
| Complex logic, integrations, security code | Senior |
| Architecture decisions, unresolved blockers | CTO |
| Design, mockups | UI/UX Designer |
| User copy, error messages | Content Writer |

---

## Common Missing Tasks (Check These)

- [ ] Error handling for every API endpoint
- [ ] Input validation (frontend + backend)
- [ ] Loading and empty states (UI)
- [ ] Mobile responsive layout
- [ ] Unit tests for each module
- [ ] Integration test for full flow
- [ ] Environment variables / config
- [ ] Database indexes for query fields
- [ ] API documentation / Swagger
- [ ] Security rate limiting

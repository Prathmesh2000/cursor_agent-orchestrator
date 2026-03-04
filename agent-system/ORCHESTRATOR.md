# 🎯 ORCHESTRATOR v7.0

The single source of truth for running the multi-agent system.
48 Agents · 77 Skills · 42 Triggers · Commit-at-every-unit protocol.

---

## ⚡ THE COMMIT RULE (most important rule in v7)

```
COMMIT AFTER EVERY ATOMIC UNIT OF WORKING CODE.

An atomic unit is:
  ✅ One model / schema created
  ✅ One service method complete + unit test passes
  ✅ One API endpoint implemented + integration test passes
  ✅ One React component working + renders
  ✅ One custom hook complete + test passes
  ✅ One migration file written
  ✅ One Storybook story rendering
  ✅ One config file that makes something actually connect
  ✅ One test file complete with all tests passing
  ✅ One utility function complete + tested

NOT a commit trigger:
  ❌ Half a service
  ❌ Multiple unrelated files bundled together
  ❌ "WIP" commits on main (stash instead)
  ❌ Code with failing tests
  ❌ Linting errors

The result: git log reads like a changelog of working units.
Every commit = a safe revert point.
```

### Commit Format (Conventional Commits — enforced)

```bash
# Models / DB
git commit -m "feat(db): add User model with email + passwordHash fields"
git commit -m "feat(db): add migration 001-create-users-table"
git commit -m "feat(db): add Order model with status enum and FK to users"
git commit -m "feat(db): add index on orders.user_id + status"

# Services — one commit per method when method is non-trivial
git commit -m "feat(auth): add hashPassword and comparePassword utilities"
git commit -m "feat(auth): add generateAccessToken with 15m expiry"
git commit -m "feat(auth): add generateRefreshToken with 7d expiry"
git commit -m "feat(orders): add OrderService.create with inventory validation"
git commit -m "feat(orders): add OrderService.cancel with status guard"
git commit -m "feat(orders): add OrderService.list with pagination"

# Routes / Controllers — one commit per endpoint
git commit -m "feat(auth): add POST /auth/login endpoint"
git commit -m "feat(auth): add POST /auth/refresh endpoint"
git commit -m "feat(auth): add POST /auth/logout endpoint"
git commit -m "feat(orders): add GET /orders endpoint with filters"
git commit -m "feat(orders): add GET /orders/:id endpoint"
git commit -m "feat(orders): add POST /orders endpoint"

# Tests — commit with the code, or as its own atomic commit
git commit -m "test(auth): add unit tests for token generation"
git commit -m "test(auth): add integration tests for login flow"
git commit -m "test(orders): add OrderService unit tests"

# Frontend
git commit -m "feat(ui): add LoginForm component with validation"
git commit -m "feat(ui): add useAuthStore with Zustand persist"
git commit -m "feat(ui): add axios interceptor with auto-refresh"
git commit -m "feat(ui): add ProtectedRoute component"
git commit -m "feat(ui): add LoginPage with redirect logic"

# Config / Infrastructure
git commit -m "chore: add Sequelize DB connection config"
git commit -m "chore: add Redis client with retry"
git commit -m "chore: add Jest config with 80% coverage threshold"

# Fixes (after review or tests catch something)
git commit -m "fix(auth): prevent refresh loop on 401 from /auth/refresh"
git commit -m "fix(orders): handle null user in cancel validation"
git commit -m "fix(ui): show error message when login fails"

# Docs
git commit -m "docs: update CHANGELOG for auth system"
git commit -m "docs: add auth API runbook"
```

---

## How the Orchestrator Runs

```
USER → [keyword triggers] → ORCHESTRATOR
                                │
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                  ▼
        Detect type      Existing repo?       Select agents
              │                 │                  │
              │          YES: Brownfield       NO: Skip
              │          Lead first
              │
              ▼
        Set up branch
        feature/[ticket]-[desc]
        COMMIT: "chore: init branch"
              │
              ▼
        Execute phases
        COMMIT after every atomic unit
              │
              ▼
        PR with full commit history
```

---

## Trigger → Agent Map (42 triggers)

| Trigger | Agents | Commit cadence |
|---|---|---|
| `Planner:` | PM + Brainstormer | No code — outputs PRD file |
| `Bug:` | Debugger → Engineer | 1 fix commit + 1 regression test commit |
| `Workflow:` | Full loop (see below) | Commits per unit across all phases |
| `Explore:` | Codebase Intelligence + Pattern Compliance | Commits pattern-cards to output/docs/ |
| `Sync:` | Pattern Compliance | Commits sync-report to output/docs/ |
| `LLD:` | LLD Designer + DB Arch + API Lead | Commits LLD doc to output/docs/lld/ |
| `HLD:` | HLD Architect + CTO | Commits HLD + ADRs |
| `Micro:` | Microservice Architect | Commits architecture decisions |
| `Decompose:` | Monolith Decomp Strategist | Commits per phase of strangler fig |
| `Scaffold:` | Service Scaffold Engineer | Commits full scaffold in one commit |
| `Contract:` | Contract Architect | Commits contract YAML + types |
| `Trace:` | Observability Architect | Commits instrumentation per service |
| `ADR:` | ADR Custodian | 1 commit per ADR file |
| `EventStorm:` | DDD Architect | Commits event-storm + context map |
| `DDD:` | DDD Architect + Senior Eng | Commits per domain layer built |
| `Resilience:` | Resilience Engineer | Commits per client wrapper + health route |
| `Brownfield:` | Brownfield Lead → Engineer | Pattern card commit, then per unit |
| `Gateway:` | Backend Architect + Resilience Eng | Commits middleware + routes per service |
| `Test:` | QA Lead | Commits per test file |
| `DevOps:` | DevOps + AWS Architect | Commits per CI step / Dockerfile |
| `Git:` | (git-workflow skill) | — |
| `MCP:` | MCP Engineer | Commits per tool handler |
| `Release:` | Release Manager + DevOps | Commits CHANGELOG + tag |
| `Infra:` | AWS + Infrastructure Eng | Commits per Terraform module |
| `Doc:` | Technical/Functional Writer | Commits doc file |
| `Observe:` | Observability Engineer | Commits dashboard + alert configs |
| `Incident:` | Incident Commander | Commits post-mortem |
| `Data:` | Data Engineer | Commits per pipeline stage |
| `Research:` | Researcher | Commits research report |
| `Prompt:` | Prompt Engineer | Commits prompt file |
| `AI:` | AI Engineer | Commits per integration layer |
| `ML:` | ML Engineer | Commits per pipeline component |
| `API:` | API Design Lead | Commits OpenAPI spec + contract tests |
| `Monorepo:` | Platform Engineer | Commits config files |
| `Review:` | Code Reviewer + Security | Commits review report |
| `UI:` | Frontend Architect | Commits per component/hook/store |
| `Auth:` | Auth Engineer + Security | Commits per endpoint + middleware |
| `Realtime:` | Real-Time Engineer | Commits server + client hook |
| `Search:` | Search Engineer | Commits index setup + service + hook |
| `Design:` | Design System Engineer | Commits per token file + component |
| `Upload:` | Backend Architect | Commits route + hook |
| `Email:` | Backend Architect | Commits template + service |

---

## Execution Phases (Workflow: in full)

### The Full Loop (what actually happens)

```
Phase 0:  Branch setup + codebase map (if existing repo)
Phase 1:  Requirements (PM + Brainstormer) → PRD + task board
Phase 2:  UX Design (UI/UX Designer, interview protocol, 3 rounds)
Phase 2b: Technical Design (LLD/HLD)

Phase 3:  DB Foundation tasks → each through task loop
Phase 4:  ALL implementation tasks → each through the loop:

          ┌───────────────────────────────────────────┐
          │ PER-TASK LOOP (every single task)         │
          │                                           │
          │  ASSIGN → Junior or Senior?               │
          │     ↓                                     │
          │  IMPLEMENT → commit per atomic unit       │
          │     ↓                                     │
          │  TEST AGENT → unit tests for this task    │
          │     FAIL → fix → commit → retest          │
          │     PASS ↓                                │
          │  SECURITY CHECK → (sensitive tasks only)  │
          │     ISSUES → fix → commit → recheck       │
          │     CLEAR ↓                               │
          │  CODE REVIEW → per task                   │
          │     CHANGES → fix → commit → re-review    │
          │     APPROVED ↓                            │
          │  ✅ TASK DONE → next task                 │
          └───────────────────────────────────────────┘

Phase 5:  Integration + wiring (Senior Engineer)
Phase 6:  Integration Test (QA Lead, full feature end-to-end)
          FAIL → re-open owning task → task loop → retest
Phase 7:  Product Review (PM checks every PRD acceptance criterion)
          GAPS → new task → task loop → re-review
Phase 8:  End Consumer Feedback (Agent 10, cold user simulation)
          BLOCKED → new task → task loop → re-run consumer
Phase 9:  Documentation → CHANGELOG + runbook
Phase 10: PR
```

See WORK_MANAGER.md for complete loop details, report formats, and task board.

---

## Commit Granularity by Layer

```
LAYER           COMMIT UNIT                           COMMIT WHEN
──────────────  ────────────────────────────────────  ──────────────────────────
DB Model        One model file                        File created + lint passes
Migration       One migration file                    Written (even before running)
Service method  One method                            Method works + unit test green
Endpoint        One route handler                     Handler + integration test green
Middleware      One middleware function               Works + test passes
React component One component file                   Component renders, no errors
Custom hook     One hook                              Hook works + test passes
Zustand store   One store slice                      Actions work
Storybook story One story                            Renders in Storybook
Config file     One connection config                Connection verified
Test file       One complete test file               All tests in file green
Migration run   After confirmed up+down works        Post-verify
Seed file       One seed                             Data appears in DB
```

---

## The Handoff Template

```markdown
## Handoff: Phase [X] → Phase [Y]
Agent completing: [name]
Branch: feature/[ticket]-[desc]

### Commits made this phase
- feat(db): add User model         → src/models/User.ts
- feat(db): add migration 001      → db/migrations/001-create-users.ts
- feat(auth): add token helpers    → src/utils/tokens.ts
- test(auth): add token unit tests → tests/unit/tokens.test.ts

### What next phase needs
| File | Purpose |
|------|---------|
| src/models/User.ts | Sequelize model, UUID pk, email unique, soft-delete |
| src/utils/tokens.ts | generateAccessToken(user), generateRefreshToken(user) |

### Constraints for next phase
Based on codebase patterns: use asyncHandler, return {success, data}, throw AppError

### Open items
- [ ] [Question for PM / next agent]
```

---

## Quality Gate — Before PR

```bash
# Run this sequence. Fix anything red. Commit fixes. Then open PR.

echo "=== 1. Tests ==="
npm test
# Required: 0 failures

echo "=== 2. Coverage ==="
npm run test:coverage
# Required: ≥80% lines, ≥75% branches

echo "=== 3. Lint ==="
npm run lint
# Required: 0 errors, 0 warnings

echo "=== 4. Build ==="
npm run build
# Required: 0 errors

echo "=== 5. Debug artifacts ==="
grep -r "console\.log\|debugger" src/ --include="*.ts" --include="*.tsx"
# Required: 0 results (or intentional, documented)

echo "=== 6. Commit history ==="
git log --oneline origin/main..HEAD
# Should read like a changelog: one unit per line

echo "=== 7. Branch up to date ==="
git fetch origin && git rebase origin/main
```

---

## Commit Anti-Patterns (never do these)

```
❌ git commit -m "wip"
   → Stash instead: git stash -m "wip: half-done service"

❌ git commit -m "fix stuff" / "update" / "changes"
   → Always: fix(scope): what was wrong and what fixes it

❌ One giant commit for an entire feature
   → Split into units. Each unit is its own commit.

❌ Committing code with failing tests
   → Fix the test first. Then commit.

❌ git add . (catch-all add)
   → Use: git add -p (stage hunks) or git add specific/file.ts

❌ Committing .env files
   → Always in .gitignore. Use .env.example with dummy values.

❌ Committing node_modules/
   → In .gitignore. Always.

❌ Committing generated files (dist/, build/, coverage/)
   → In .gitignore.
```

---

## Example: Auth Feature — Full Commit Log

```
$ git log --oneline origin/main..HEAD

a8f3c21 docs: add auth runbook
9d2e841 docs: update CHANGELOG for auth system
7c5b3f9 fix(auth): add rate limiting to login endpoint
4e9a2d1 fix(auth): prevent refresh loop on 401 from /auth/refresh
3b7f1c8 feat(ui): add LoginPage with redirect to /dashboard
2c6e0b7 feat(ui): add ProtectedRoute component
1a5d9f6 feat(ui): add axios interceptor with auto-refresh
0f4c8e5 feat(ui): add useAuthStore with Zustand + persist
9e3b7d4 test(auth): add integration tests for refresh endpoint
8d2a6c3 feat(auth): add POST /auth/refresh endpoint
7c1f5b2 test(auth): add integration tests for login endpoint
6b0e4a1 feat(auth): add POST /auth/login endpoint
5a9d3f0 feat(auth): add authenticate middleware
4f8c2e9 test(auth): add unit tests for token generation
3e7b1d8 feat(auth): add generateRefreshToken (7d, httpOnly cookie)
2d6a0c7 feat(auth): add generateAccessToken (15m expiry)
1c5f9b6 test(auth): add unit tests for password utilities
0b4e8a5 feat(auth): add hashPassword and comparePassword
9a3d7f4 feat(db): add index on refresh_tokens.user_id
8f2c6e3 feat(db): add migration 002-create-refresh-tokens
7e1b5d2 feat(db): add RefreshToken model
6d0a4c1 feat(db): add index on users.email (unique constraint)
5c9f3b0 feat(db): add migration 001-create-users-table
4b8e2a9 feat(db): add User model with passwordHash + roles
3a7d1f8 chore: init feature/PROJ-101-user-authentication
```

This is what a clean commit history looks like.
Every commit is a working unit. Every commit is revertable.

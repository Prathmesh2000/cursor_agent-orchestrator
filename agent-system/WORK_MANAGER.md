# 🏗️ WORK MANAGER v8.0

---

## THE COMPLETE FLOW

```
═══════════════════════════════════════════════════════════════════════
                    FEATURE LIFECYCLE
═══════════════════════════════════════════════════════════════════════

  USER REQUEST
       │
       ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  PHASE 0 — SETUP                                            │
  │  • Create branch: feature/[TICKET]-[desc]                   │
  │  • Existing repo? → Brownfield Lead: Explore + Pattern Card │
  │  • 💾 COMMIT "chore: init feature/[TICKET]-[desc]"          │
  └─────────────────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  PHASE 1 — REQUIREMENTS  [PM + Brainstormer]                │
  │  • Brainstormer: 2-3 solution approaches                    │
  │  • User picks approach                                      │
  │  • PM writes PRD: user stories + acceptance criteria        │
  │  • Task Planner: break into task board (each task sized     │
  │    and labelled Junior / Senior)                            │
  │  • 💾 COMMIT "docs: add PRD for [feature]"                  │
  └─────────────────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  PHASE 2 — UX DESIGN  [UI/UX Designer]                     │
  │  • Round 1 interview: who, device, tasks, constraints       │
  │  • Round 2 interview: flows, states, data, interactions     │
  │  • Round 3: present incrementally, confirm each section     │
  │  • Output: flow diagrams + screen specs + tokens            │
  │  • 💾 COMMIT "docs: add UX design for [feature]"           │
  │  SKIP if: pure backend / no UI                              │
  └─────────────────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  PHASE 3 — TECHNICAL DESIGN  [LLD Designer + DB Architect]  │
  │  • LLD: interfaces, method sigs, DB schema, sequences       │
  │  • HLD if 3+ services                                       │
  │  • 💾 COMMIT "docs: add LLD for [feature]"                  │
  └─────────────────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  PHASE 4 — TASK-BY-TASK BUILD LOOP                          │
  │  Every task on the board goes through the loop below.       │
  │  Tasks run in dependency order. Up to 3 in parallel.        │
  └─────────────────────────────────────────────────────────────┘
       │
       │  ◄═══════════════════════════════════════════════════╗
       │                  TASK LOOP                           ║
       ▼                                                      ║
  ┌──────────────────────────────────────────────────────┐    ║
  │  STEP 1 — ASSIGN                                     │    ║
  │                                                      │    ║
  │  Is task sensitive or complex?  ──YES──► SENIOR ENG  │    ║
  │  Is task standard / small?      ──YES──► JUNIOR ENG  │    ║
  │                                                      │    ║
  │  Sensitive = auth / payments / PII / tokens /        │    ║
  │              file upload / admin / external APIs     │    ║
  │  Complex = M+ size / unknown approach / cross-layer  │    ║
  │  Standard = CRUD / simple component / unit test /    │    ║
  │             config / migration / basic form          │    ║
  └──────────────────────────────────────────────────────┘    ║
       │                                                      ║
       ▼                                                      ║
  ┌──────────────────────────────────────────────────────┐    ║
  │  STEP 2 — IMPLEMENT  [Senior or Junior Engineer]     │    ║
  │                                                      │    ║
  │  Work unit by unit:                                  │    ║
  │  • Write code for one atomic unit                    │    ║
  │  • Run lint → clean                                  │    ║
  │  • 💾 COMMIT "feat/fix([scope]): [what this does]"  │    ║
  │  Repeat for each unit in the task.                   │    ║
  │                                                      │    ║
  │  Junior stuck > 30 min → escalate to Senior          │    ║
  │  Senior stuck → escalate to CTO                      │    ║
  └──────────────────────────────────────────────────────┘    ║
       │                                                      ║
       ▼                                                      ║
  ┌──────────────────────────────────────────────────────┐    ║
  │  STEP 3 — UNIT TEST  [Test Agent — Agent 9]          │◄─┐ ║
  │                                                      │  │ ║
  │  • Run tests scoped to THIS task's files             │  │ ║
  │  • Check coverage ≥ 80% on new code                  │  │ ║
  │  • Run adjacent file tests (catch regressions)       │  │ ║
  │                                                      │  │ ║
  │  Report:                                             │  │ ║
  │    Tests: [N passed / N total]                       │  │ ║
  │    Coverage: [N]% lines / [N]% branches              │  │ ║
  │    Regressions: none / [list]                        │  │ ║
  │    Result: ✅ PASS  or  ❌ FAIL                      │  │ ║
  │                                                      │  │ ║
  │  ❌ FAIL ──────────────────────────────────────────► │  │ ║
  │    Engineer gets: which test / what failed /         │  │ ║
  │    what was expected                                 │  │ ║
  │    → Fix → 💾 COMMIT "fix([scope]): [test caught]"  │  │ ║
  │    → ─────────────────────────────────────────────► re-test
  └──────────────────────────────────────────────────────┘  │ ║
       │ ✅ PASS                                            │ ║
       ▼                                                    │ ║
  ┌──────────────────────────────────────────────────────┐  │ ║
  │  STEP 4 — SECURITY CHECK  [Security Analyst — Ag.7]  │◄─┘ ║
  │  (only for sensitive tasks — skip otherwise)         │◄─┐ ║
  │                                                      │  │ ║
  │  Checks:                                             │  │ ║
  │  • Auth: endpoint requires auth / no priv escalation │  │ ║
  │  • Input: validated / no SQL injection / no XSS      │  │ ║
  │  • Secrets: no hardcoded / no logged / env vars only │  │ ║
  │  • Crypto: bcrypt≥12 / JWT algo explicit / HTTPS     │  │ ║
  │  • Tokens: httpOnly cookies / not localStorage       │  │ ║
  │                                                      │  │ ║
  │  Report:                                             │  │ ║
  │    🔴 ISSUE: [desc] — Fix: [specific action]         │  │ ║
  │    Result: ✅ CLEAR  or  ❌ ISSUES FOUND             │  │ ║
  │                                                      │  │ ║
  │  ❌ ISSUES ─────────────────────────────────────────►│  │ ║
  │    Engineer gets: exact issue + required fix         │  │ ║
  │    → Fix → 💾 COMMIT "fix(security): [what fixed]"  │  │ ║
  │    → ─────────────────────────────────────────────► re-check
  └──────────────────────────────────────────────────────┘  │ ║
       │ ✅ CLEAR (or N/A)                                  │ ║
       ▼                                                    │ ║
  ┌──────────────────────────────────────────────────────┐  │ ║
  │  STEP 5 — CODE REVIEW  [Reviewer — Agent 8]          │◄─┘ ║
  │                                                      │◄─┐ ║
  │  Checks:                                             │  │ ║
  │  • Logic: does code do what task says?               │  │ ║
  │  • ACs: are all acceptance criteria met?             │  │ ║
  │  • Edge cases + error handling complete?             │  │ ║
  │  • DRY / KISS / single responsibility               │  │ ║
  │  • Names clear + consistent with codebase            │  │ ║
  │  • Patterns match Pattern Card (existing repos)      │  │ ║
  │  • Test quality: tests behaviour not implementation  │  │ ║
  │                                                      │  │ ║
  │  Report:                                             │  │ ║
  │    🔴 BLOCKING: [issue] at [file:line] → Fix: [X]   │  │ ║
  │    🟡 SUGGESTION: [issue] (not blocking)             │  │ ║
  │    Result: ✅ APPROVED  or  🔄 CHANGES REQUESTED    │  │ ║
  │                                                      │  │ ║
  │  🔄 CHANGES ────────────────────────────────────────►│  │ ║
  │    Engineer gets: every 🔴 item with exact fix       │  │ ║
  │    → Fix each → 💾 COMMIT "fix([scope]): [review]"  │  │ ║
  │    → ─────────────────────────────────────────────► re-review (🔴 only)
  └──────────────────────────────────────────────────────┘  │ ║
       │ ✅ APPROVED                                        │ ║
       ▼                                                      ║
  ┌──────────────────────────────────────────────────────┐    ║
  │  ✅ TASK DONE                                        │    ║
  │  All units committed / tests pass / security clear / │    ║
  │  review approved / no regressions                    │    ║
  └──────────────────────────────────────────────────────┘    ║
       │                                                      ║
       ▼                                                      ║
  More tasks on board? ─── YES ──────────────────────────────╝
       │
       NO (all tasks done)
       │
       ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  PHASE 5 — INTEGRATION + WIRING  [Senior Engineer]          │
  │  • Wire FE hooks to real BE endpoints                       │
  │  • Run full npm test                                        │
  │  • 💾 COMMIT "feat([scope]): wire [component] to [endpoint]"│
  │  • Fix breaks → 💾 COMMIT "fix([scope]): [issue]"          │
  └─────────────────────────────────────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────────────────────────────────┐ ◄─────────────┐
  │  PHASE 6 — INTEGRATION TEST  [QA Lead — Agent 17]        │               │
  │                                                          │               │
  │  Test every flow from UX design spec:                    │               │
  │  • Happy paths (all of them)                             │               │
  │  • Error paths (all of them)                             │               │
  │  • Empty states                                          │               │
  │  • Role/permission variants                              │               │
  │  • Cross-browser (Chrome / Firefox / mobile Safari)      │               │
  │  • Real data volume (50+ items not just 1)               │               │
  │                                                          │               │
  │  Report per flow:                                        │               │
  │    ✅ PASS  or  ❌ FAIL [expected vs actual]             │               │
  │                                                          │               │
  │  ❌ FAIL:                                                │               │
  │    → Identify owning task                                │               │
  │    → Re-open that task → back into TASK LOOP (Step 2)    │               │
  │    → After fix: re-run integration test ──────────────── │ ──────────────┘
  └──────────────────────────────────────────────────────────┘
       │ ✅ ALL FLOWS PASS
       ▼
  ┌──────────────────────────────────────────────────────────┐ ◄─────────────┐
  │  PHASE 7 — PRODUCT REVIEW  [PM — Agent 2]                │               │
  │                                                          │               │
  │  PM reads original PRD, checks every AC:                 │               │
  │    ✅ MET — works exactly as specified                   │               │
  │    ❌ GAP — missing or different from spec               │               │
  │    ⚠️  PARTIAL — works but with caveats                  │               │
  │                                                          │               │
  │  Report:                                                 │               │
  │    AC-01: [desc] .... ✅ MET                             │               │
  │    AC-02: [desc] .... ❌ GAP → Required: [what needed]  │               │
  │                                                          │               │
  │  ❌ GAPS:                                                │               │
  │    → PM creates new task per gap → enters task board     │               │
  │    → New task goes through full TASK LOOP                │               │
  │    → After fix: PM re-reviews ──────────────────────────│ ──────────────┘
  └──────────────────────────────────────────────────────────┘
       │ ✅ ALL ACs MET
       ▼
  ┌──────────────────────────────────────────────────────────┐ ◄─────────────┐
  │  PHASE 8 — END CONSUMER FEEDBACK  [Agent 10]             │               │
  │                                                          │               │
  │  Simulates real user — no prior context, no PRD read:   │               │
  │  • Attempt primary goal cold (no guidance)               │               │
  │  • Note: confusion / missing feedback / surprise         │               │
  │  • Try common mistakes: wrong input / back / re-submit   │               │
  │                                                          │               │
  │  Report:                                                 │               │
  │    First impression: [what stood out]                    │               │
  │    Goal: [task] → ✅ Completed / ⚠️ Struggled / ❌ Failed│               │
  │    Confusion: [list of friction points]                  │               │
  │    Missing feedback: [moments of uncertainty]            │               │
  │    Verdict: ✅ SATISFIED / ⚠️ MINOR / ❌ BLOCKED        │               │
  │                                                          │               │
  │  ❌ BLOCKED (cannot complete core task):                 │               │
  │    → PM creates task → full TASK LOOP → re-run consumer ─│ ──────────────┘
  │  ⚠️  MINOR: PM triages → fix now or log for next sprint  │
  └──────────────────────────────────────────────────────────┘
       │ ✅ SATISFIED
       ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  PHASE 9 — DOCUMENTATION  [Technical Writer]                │
  │  • Update CHANGELOG.md                                      │
  │  • Add runbook (if backend service)                         │
  │  • Update API reference (if new endpoints)                  │
  │  • 💾 COMMIT "docs: update CHANGELOG for [feature]"         │
  └─────────────────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  PHASE 10 — PR                                              │
  │  • npm test → 0 failures                                    │
  │  • npm run lint → 0 warnings                                │
  │  • npm run test:coverage → ≥80% lines                       │
  │  • git log --oneline → reads like changelog                 │
  │  • git rebase origin/main                                   │
  │  • Open PR: feat([scope]): [what this delivers]             │
  └─────────────────────────────────────────────────────────────┘
       │
       ▼
    DONE ✅
```

---

## Junior vs Senior Assignment

```
TASK SIGNAL                                    → ASSIGN TO
───────────────────────────────────────────────────────────
Standard CRUD endpoint (one resource)          → Junior
Simple React component (display, no state)     → Junior
Basic form (validation schema provided)        → Junior
Unit test for already-written function         → Junior
Simple utility / helper function               → Junior
DB model (structure decided in LLD)            → Junior
Migration: simple add-column or create-table   → Junior
Config file (pattern is clear)                 → Junior
Docs / changelog update                        → Junior
Storybook story for existing component         → Junior
Simple bug fix (1-3 lines, root cause clear)   → Junior

Auth / payments / permissions / tokens         → Senior
Any task touching user PII                     → Senior
Cross-service or cross-layer integration       → Senior
Service with complex business logic (3+ paths) → Senior
State machine / complex flow                   → Senior
Performance-sensitive (DB query, caching)      → Senior
Approach not fully decided yet                 → Senior
Task with unknown unknowns                     → Senior
Size M or L (≥ 3 hours)                        → Senior
Refactor touching > 3 existing files           → Senior
Complex bug (root cause unclear)               → Senior
Third-party API integration                    → Senior
Middleware (auth, rate limit, error handling)  → Senior

Junior stuck > 30 min                          → Escalate to Senior
Senior stuck / architecture unclear            → Escalate to CTO
```

---

## Task Schema

```
## Task [ID] — [Title]

Assign:    Junior / Senior
Size:      XS (<1h) | S (<3h) | M (<8h) | L (break down)
Sensitive: YES 🔐 / NO
Depends:   [task IDs that must complete first]
Blocks:    [task IDs waiting for this]

Description:
  [One paragraph — what to build]

Acceptance Criteria:
  - [ ] [criterion 1]
  - [ ] [criterion 2]
  - [ ] All unit tests pass (≥80% coverage)
  - [ ] Lint clean
  - [ ] Code committed

Planned commits:
  - [ ] 💾 feat([scope]): [atomic unit 1]
  - [ ] 💾 feat([scope]): [atomic unit 2]
  - [ ] 💾 test([scope]): [test description]
```

---

## Task Board

```
FEATURE: [Name]    BRANCH: feature/[TICKET]-[desc]
══════════════════════════════════════════════════════════════════

ID      TITLE                            ASSIGN   SENSITIVE  STATE
──────  ───────────────────────────────  ───────  ─────────  ──────────────
DB-01   User model + migration           Junior   NO         ✅ DONE
DB-02   RefreshToken model + migration   Junior   YES 🔐     ✅ DONE
BE-01   hashPassword / comparePassword   Junior   YES 🔐     ✅ DONE
BE-02   generateAccessToken              Junior   YES 🔐     ✅ DONE
BE-03   generateRefreshToken             Senior   YES 🔐     ✅ DONE
BE-04   authenticate middleware          Senior   YES 🔐     🔄 REVIEW
BE-05   POST /auth/login                 Senior   YES 🔐     🧪 UNIT TEST
BE-06   POST /auth/refresh               Senior   YES 🔐     ⬜ PENDING
BE-07   POST /auth/logout                Junior   YES 🔐     ⬜ PENDING
FE-01   useAuthStore                     Junior   NO         ⬜ PENDING
FE-02   axios interceptor + refresh      Senior   YES 🔐     ⬜ PENDING
FE-03   LoginForm component              Junior   NO         ⬜ PENDING
FE-04   ProtectedRoute                   Junior   NO         ⬜ PENDING
FE-05   LoginPage                        Junior   NO         ⬜ PENDING

══════════════════════════════════════════════════════════════════
TASKS:    5 ✅ done  |  2 🔄 in loop  |  7 ⬜ pending
PHASE 6 INTEGRATION TEST:  ⬜ waiting for all tasks
PHASE 7 PRODUCT REVIEW:    ⬜ waiting
PHASE 8 END CONSUMER:      ⬜ waiting

LOOP LOG (resolved):
  BE-03: Test FAIL (expiry wrong) → fix → ✅ Test PASS → ✅ Security CLEAR → ✅ Review APPROVED
  BE-01: Review 🔴 (naming) → fix → ✅ Review APPROVED

LOOP LOG (active):
  BE-04: Step 5 Review — Reviewer reading authenticate middleware
  BE-05: Step 3 Unit Test — Test Agent running tests
```

---

## Commit Format

```bash
# One commit per atomic unit — every unit must pass lint + tests first

feat([scope]): [what this unit adds]        ← new functionality
fix([scope]): [what was wrong, now fixed]   ← bug fix from any loop step
test([scope]): [what the tests cover]       ← test file complete
docs: [what was documented]                 ← docs/changelog
chore: [tooling/config change]              ← setup, deps

# Examples
feat(db): add User model with email and passwordHash
feat(db): add migration 001-create-users-table
feat(auth): add hashPassword and comparePassword utilities
test(auth): add unit tests for password utilities
feat(auth): add generateAccessToken with 15m expiry
feat(auth): add POST /auth/login endpoint
test(auth): add integration tests for login endpoint
fix(auth): prevent token refresh loop on 401 — caught in unit test
fix(security): store token in httpOnly cookie not localStorage
fix(auth): add missing auth check on admin endpoint — caught in review
feat(ui): add LoginForm component with validation
feat(ui): add useAuthStore with Zustand persist
feat(ui): wire LoginForm to POST /auth/login
docs: update CHANGELOG for auth feature
```

---

## Loop Report Formats

### Unit Test Report (Test Agent — per task)
```
╔══════════════════════════════════════════╗
║  UNIT TEST REPORT — Task [ID]            ║
║  Files: [list of files tested]           ║
║  Tests:    [N] passed / [N] total        ║
║  Coverage: [N]% lines / [N]% branches   ║
║  Regressions: none / [list if any]       ║
║  Result:   ✅ PASS  or  ❌ FAIL          ║
╠══════════════════════════════════════════╣
║  ❌ FAILURES (if any):                   ║
║  Test: [test name]                       ║
║  Expected: [value]                       ║
║  Received: [value]                       ║
║  → Engineer fix required                 ║
╚══════════════════════════════════════════╝
```

### Security Report (Security Analyst — sensitive tasks only)
```
╔══════════════════════════════════════════╗
║  SECURITY REPORT — Task [ID]             ║
║  Sensitivity: HIGH / MEDIUM              ║
║  Checks run: [N]                         ║
║  Issues found: [N]                       ║
╠══════════════════════════════════════════╣
║  🔴 ISSUE: [description]                 ║
║     Severity: HIGH / MEDIUM              ║
║     Fix: [exact action required]         ║
║     File: [file:line if known]           ║
╠══════════════════════════════════════════╣
║  Result: ✅ CLEAR  or  ❌ ISSUES FOUND   ║
╚══════════════════════════════════════════╝
```

### Code Review Report (Reviewer — per task)
```
╔══════════════════════════════════════════╗
║  CODE REVIEW — Task [ID]                 ║
║  Files reviewed: [list]                  ║
╠══════════════════════════════════════════╣
║  🔴 BLOCKING (must fix):                 ║
║     Issue: [description]                 ║
║     File: [file:line]                    ║
║     Fix: [specific action]               ║
╠══════════════════════════════════════════╣
║  🟡 SUGGESTION (not blocking):           ║
║     Issue: [description]                 ║
╠══════════════════════════════════════════╣
║  Result: ✅ APPROVED  or  🔄 CHANGES     ║
╚══════════════════════════════════════════╝
```

### Integration Test Report (QA Lead — after all tasks)
```
╔═══════════════════════════════════════════════════╗
║  INTEGRATION TEST REPORT — [Feature Name]         ║
║  Environment: local / staging                     ║
╠═══════════════════════════════════════════════════╣
║  Flow: [name] — happy path           ✅ / ❌      ║
║  Flow: [name] — error path           ✅ / ❌      ║
║  State: empty                        ✅ / ❌      ║
║  State: loading                      ✅ / ❌      ║
║  Role: admin                         ✅ / ❌      ║
║  Role: user                          ✅ / ❌      ║
║  Browser: Chrome                     ✅ / ❌      ║
║  Browser: mobile Safari              ✅ / ❌      ║
╠═══════════════════════════════════════════════════╣
║  ❌ FAILURES:                                      ║
║  [flow name] — Expected: [X] — Got: [Y]           ║
║  → Owning task: [ID] — re-opens for task loop     ║
╠═══════════════════════════════════════════════════╣
║  Result: ✅ ALL PASS  or  ❌ [N] FAILURES         ║
╚═══════════════════════════════════════════════════╝
```

### Product Review Report (PM — after integration test)
```
╔══════════════════════════════════════════╗
║  PRODUCT REVIEW — [Feature Name]         ║
║  PRD: output/docs/PRD-[feature].md       ║
╠══════════════════════════════════════════╣
║  AC-01: [criterion] ......... ✅ MET     ║
║  AC-02: [criterion] ......... ❌ GAP     ║
║    Gap: [what's missing]                 ║
║    Required: [what to build]             ║
║  AC-03: [criterion] ......... ⚠️ PARTIAL ║
║    Issue: [difference from spec]         ║
╠══════════════════════════════════════════╣
║  Non-goals confirmed NOT built: ✅ / ❌  ║
║  Result: ✅ APPROVED  or  ❌ GAPS        ║
╚══════════════════════════════════════════╝
```

### End Consumer Report (Agent 10 — after PM approval)
```
╔══════════════════════════════════════════════╗
║  END CONSUMER FEEDBACK — [Feature Name]      ║
║  Persona: [user type from PRD]               ║
╠══════════════════════════════════════════════╣
║  First impression:                           ║
║    [What stood out immediately]              ║
║                                              ║
║  Primary task: [goal from PRD]               ║
║  Result: ✅ Completed / ⚠️ Struggled / ❌ Failed
║  Path taken: [what the user actually did]    ║
║                                              ║
║  Confusion points:                           ║
║    - [unclear label / unexpected behaviour]  ║
║    - [where they hesitated or got stuck]     ║
║                                              ║
║  Missing feedback:                           ║
║    - [moments where action result unclear]   ║
║                                              ║
║  What worked well:                           ║
║    - [felt natural / intuitive]              ║
╠══════════════════════════════════════════════╣
║  Verdict: ✅ SATISFIED                       ║
║         / ⚠️ MINOR ISSUES (PM triages)       ║
║         / ❌ BLOCKED → new task → loop       ║
╚══════════════════════════════════════════════╝
```

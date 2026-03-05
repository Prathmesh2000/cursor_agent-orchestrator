---
name: "brownfield-workflow"
description: "Use when adding a feature, fixing a bug, or making changes to an existing codebase. Triggers: \"existing codebase\", \"add to existing\", \"existing project\", \"extend this\", \"modify this\", \"working in existing repo\", \"change this feature\", \"add this to my project\", \"how do I add X to this code\", or any task involving code that already exists. This skill governs the complete protocol for incremental work in existing repos."
---


# Brownfield Workflow Skill

The complete playbook for working in an existing codebase: understand first, design second, implement third, validate sync last. Every step prevents rework.

---

## The Core Rule

```
Greenfield (new): Design → Implement → Test
Brownfield (existing): Understand → Confirm Patterns → Design → Implement → Validate Sync → Test

The extra steps (Understand + Validate Sync) prevent the most common failures:
  - Implementing in the wrong pattern → rejected in PR review
  - Introducing new dependencies that conflict with existing ones
  - Writing tests in the wrong structure → CI fails
  - Naming files/classes inconsistently → team friction forever
```

---

## Phase 0 — Triage (before anything else)

```
Answer these 4 questions before writing a line of code:

1. What kind of change is this?
   Bug fix:          → find root cause → minimal change → test regression
   Small feature:    → find analog → mirror it → sync check
   Medium feature:   → LLD from existing patterns → implement → sync check
   Large feature:    → HLD → LLD (codebase-aware) → implement → sync check
   Refactor:         → dependency map → strangler fig → phased migration

2. How much of the codebase does this touch?
   1-2 files:        → Read those files → implement → done
   3-10 files:       → Read all touched files + their tests
   Cross-cutting:    → Full Explore: (codebase map + pattern extraction)

3. Does a Codebase Map exist?
   Yes (< 2 weeks):  → Read it → extract relevant patterns → proceed
   Yes (> 2 weeks):  → Re-run Phase 2-3 of Explore: for the relevant layers
   No:               → Run Explore: first (non-negotiable)

4. Is there a directly analogous feature already in the codebase?
   Yes:              → Read ALL files of that analog → use as template
   No:               → Find the closest analog → adapt
```

---

## Phase 1 — Understand the Surrounding Code

Before implementing anything, read these specific files:

```bash
# Step 1: Understand the entry point for your change
# If adding a new endpoint:
cat src/routes/[closest-route-file].ts     # how routes are structured
cat src/controllers/[existing].ts          # controller pattern
cat src/services/[existing].ts             # service pattern

# If adding to frontend:
cat src/components/[similar-component]/[Component].tsx
cat src/components/[similar-component]/[Component].test.tsx
cat src/hooks/use[Similar].ts

# Step 2: Read the TESTS for the code you're changing
# This tells you what "done" looks like here
cat tests/unit/[existing-service].test.ts
cat tests/integration/[existing-route].test.ts

# Step 3: Find what imports the code you're changing
# (blast radius — what else might break)
grep -rn "import.*[ModuleYouAreChanging]\|require.*[ModuleYouAreChanging]" src/ --include="*.ts"

# Step 4: Understand the data model
cat src/models/[relevant].ts
cat db/migrations/[latest-related-migration].ts
```

---

## Phase 2 — Extract the Exact Pattern (fill this card)

Do NOT skip this. This is the template for your implementation.

```
═══════════════════════════════════════════════════════
BROWNFIELD PATTERN CARD
═══════════════════════════════════════════════════════
Feature being added:     ___________________________
Analog feature found:    ___________________________
Analog files read:       ___________________________

CONTROLLER pattern:
  Wrapper:            [ asyncHandler / try-catch / decorator ]
  Request parsing:    [ req.body / Zod / Joi / class-validator ]
  Response shape:     { success, data } / { data } / plain object
  Error format:       { success: false, error } / { message } / throw
  Auth access:        req.user / req.auth / other: ___

SERVICE pattern:
  Export:             [ class singleton / named functions / class+DI ]
  Error throwing:     [ AppError(msg, code) / throw new Error / return null ]
  Validation:         [ in service / in validator file / at route level ]
  DB access:          [ model directly / via repository / raw queries ]

MODEL/DB pattern:
  ORM:                [ Sequelize / TypeORM / Prisma / Mongoose / raw ]
  Timestamps:         [ auto createdAt/updatedAt / manual / none ]
  Soft delete:        [ paranoid:true / deletedAt / hard delete ]
  Convention:         [ camelCase cols / snake_case cols ]

TEST pattern:
  File location:      [ tests/unit/ / alongside source / __tests__/ ]
  Test runner:        [ Jest / Vitest / Mocha ]
  Mock approach:      [ jest.mock() / manual mocks / sinon ]
  DB in tests:        [ real test DB / in-memory / mocked ]
  Describe structure: describe('[Layer] [Name]') / other: ___
  Assertion style:    [ expect().toBe / assert.equal / other ]

NAMING:
  Files:              [ camelCase / PascalCase / kebab-case ]
  Classes:            [ PascalCase ]
  Constants:          [ UPPER_SNAKE / camelCase ]
  DB tables:          [ snake_case / camelCase ]
  Routes:             [ kebab-case / camelCase ]

CONSTRAINTS (from codebase map or observation):
  ✅ Must:  _______________________________________________
  ✅ Must:  _______________________________________________
  ❌ Never: _______________________________________________
  ❌ Never: _______________________________________________
═══════════════════════════════════════════════════════
```

---

## Phase 3 — Design Before Implementing (proportional to size)

```
Bug fix (1-5 lines):
  → Write the fix in a comment first
  → "The bug is: X. The fix is: change Y to Z because..."
  → Confirm understanding before writing code

Small feature (1-2 new files):
  → Write out function signatures and data flow before coding
  → "I will add [method] to [service] that [does X]. It takes [args] and returns [type]."

Medium feature (3-10 files):
  → Fill out mini-LLD:
    Module structure (file names)
    Method signatures for new code
    DB changes (if any)
    API changes (if any)
    Test plan (what to test per method)
  → Get confirmation before coding

Large feature (10+ files):
  → Full LLD: (trigger LLD: workflow)
  → LLD must be codebase-aware (built from patterns extracted in Phase 2)
  → LLD approved before any code
```

---

## Phase 4 — Implement (from the Pattern Card)

```
Rule: Every file you create should be indistinguishable from 
an existing file in the same folder, except for its content.

Checklist during implementation:
  [ ] File name matches convention (check Pattern Card)
  [ ] Import paths match existing files in same folder
  [ ] Export style matches (default vs named, class vs function)
  [ ] Response format matches existing controllers
  [ ] Error throwing style matches existing services
  [ ] DB access pattern matches existing models/repos
  [ ] No new dependencies without discussion
  [ ] No new abstractions when existing ones work
  [ ] Test file in correct location
  [ ] Test structure mirrors existing test files
```

---

## Phase 5 — Validate Sync (before PR, no exceptions)

Run these checks against the Pattern Card:

```bash
# 1. File naming sync
ls src/[layer]/            # existing files
# New file matches the naming convention?

# 2. Import style sync
head -10 src/[layer]/[existing].ts   # what does existing import?
head -10 src/[layer]/[new].ts        # does new file match?

# 3. Response format sync (for controllers)
grep "res.json\|res.status\|res.send" src/controllers/[existing].ts | head -5
grep "res.json\|res.status\|res.send" src/controllers/[new].ts | head -5
# Same structure?

# 4. Error handling sync
grep "throw\|AppError\|CustomError\|catch" src/services/[existing].ts | head -5
grep "throw\|AppError\|CustomError\|catch" src/services/[new].ts | head -5

# 5. Test structure sync
head -20 tests/unit/[existing].test.ts
head -20 tests/unit/[new].test.ts
# Same describe structure, same beforeEach pattern?

# 6. Run existing tests — they must still pass
npm test
# If any pre-existing tests fail: stop. Fix them first.

# 7. Run linter
npm run lint
# Zero new warnings or errors
```

**Sync Report format:**
```
SYNC REPORT — [Feature Name]
Generated: [date]
Pattern Card from: [analog feature]

Layer       | Status | Issue
------------|--------|------
Controller  |  ✅    | Matches asyncHandler + {success,data} pattern
Service     |  ✅    | Matches class singleton + AppError pattern
Model       |  ✅    | Matches Sequelize + paranoid:true + camelCase
Routes      |  ✅    | Matches authenticate → validate → controller
Tests       |  ❌    | Test file in wrong location (should be tests/unit/, not src/)
Naming      |  ✅    | All files camelCase, classes PascalCase
Imports     |  ⚠️    | Used default export where existing uses named — double check

Action required: Move test file. Clarify export style.
```

---

## Common Brownfield Failure Modes

```
Failure Mode 1: "I'll just write it my way, it's cleaner"
  Impact: Every PR review is a pattern debate, not a logic review
  Fix: Follow existing patterns. If you want to improve them, file a separate PR.

Failure Mode 2: Introducing a new library that duplicates existing functionality
  Impact: Two ways to do the same thing → permanent inconsistency debt
  Before adding any new dependency:
    Check package.json — does something similar exist?
    Ask: can this be solved with what's already there?

Failure Mode 3: Assuming DB column naming from code (should check actual schema)
  Impact: Runtime errors, inconsistent migration patterns
  Fix: Always read an existing migration file before writing DB code

Failure Mode 4: Writing tests that mock differently than existing tests
  Impact: Some things tested one way, other things another way → confusing test suite
  Fix: Read test setup files AND existing tests before writing tests

Failure Mode 5: Not reading the error handling middleware
  Impact: Your service throws a different error format than the rest of the app
  Fix: Read middleware/errorHandler.ts first. Throw the errors it expects.

Failure Mode 6: Adding new routes in a different router file than expected
  Impact: Route ordering issues, auth not applied, route not registered
  Fix: Read src/routes/index.ts (or equivalent) to understand how routes are registered
```

---

## Incremental Refactoring Rules

When the existing code has a pattern you disagree with:

```
1. Do NOT fix it in the same PR as your feature. (mixing concerns, hard to review)

2. Create a tech-debt ticket for the cleanup:
   "Pattern: [X] uses [old pattern]. Should use [new pattern]. Affects N files."

3. If you MUST fix it (it blocks your work):
   a. Do it in a separate commit or PR — "refactor: migrate [X] to [new pattern]"
   b. Get agreement first (don't surprise the team)
   c. Update the Codebase Map

4. If you see conflicting patterns (some use A, some use B):
   a. Note it in the Sync Report as a Hot Spot
   b. Ask: "Which pattern should new code follow?"
   c. Record the decision as an ADR
   d. Do NOT silently pick one
```

---

## Output

```
output/docs/pattern-cards/[feature]-pattern-card.md    ← Phase 2
output/docs/sync-reports/[feature]-sync-report.md      ← Phase 5
src/[layer]/[new-files].ts                             ← Phase 4 output
tests/[location]/[new-tests].ts                        ← Phase 4 output
```

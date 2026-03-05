---
name: "code-sync-advisor"
description: "Use when checking if new or proposed code is in sync with an existing codebase's patterns, conventions, and architecture. Triggers: \"is this in sync\", \"does this match our patterns\", \"code review for convention compliance\", \"pattern compliance\", \"will this fit the codebase\", \"before I submit this PR\", \"code drift\", or after any implementation in an existing repo. This skill is the gatekeeper — run it before code review."
---


# Code Sync Advisor Skill

Verify that new or modified code is in perfect sync with the existing codebase. Catches drift before it becomes review feedback or technical debt. Runs against the Codebase Map and Pattern Cards.

---

## The Sync Check (run before every PR)

### Step 1: Structural Sync

```bash
# Check new file names match existing convention
ls src/services/              # existing: userService.ts, productService.ts
ls src/services/ | grep [new] # new: orderService.ts ← ✅ or OrderService.ts ← ❌?

# Check folder placement
# New file location vs where existing similar files live
find src -name "*[similar-concept]*" | grep -v test  # where do they live?
```

Structural checklist:
```
[ ] File is in the correct folder (matches where similar files live)
[ ] File name follows existing naming convention (camelCase/PascalCase/kebab)
[ ] Class name follows existing convention
[ ] Export style matches (default export / named export / singleton)
[ ] Index barrel file updated if the codebase uses them
    grep -rn "export.*from.*[folder]" src/index.ts
```

---

### Step 2: Pattern Sync

Compare new code to the Pattern Card side-by-side:

```
CONTROLLER CHECK                 REQUIRED (from Pattern Card)    NEW CODE
───────────────                  ───────────────────────────    ──────────
Error wrapper                    asyncHandler(...)               ✅/❌
Response format                  { success: true, data: X }      ✅/❌
Auth access                      req.user.[field]                ✅/❌
Error throwing                   throw new AppError(msg, code)   ✅/❌

SERVICE CHECK
Export style                     export default new Service()    ✅/❌
DB access method                 Model.findOne({ where: {...} }) ✅/❌
Not-found error                  throw new AppError('...', 404)  ✅/❌
Transaction pattern              sequelize.transaction(async t)  ✅/❌

MODEL CHECK
ORM syntax                       Sequelize v6 DataTypes          ✅/❌
Table name format                snake_case                      ✅/❌
Soft delete                      paranoid: true                  ✅/❌
Timestamps                       timestamps: true                ✅/❌

TEST CHECK
Framework + structure            describe/it with factories      ✅/❌
Mock approach                    jest.mock('module')             ✅/❌
Seed approach                    createUserFactory({ ... })      ✅/❌
File location                    tests/unit/[name].test.ts       ✅/❌
```

---

### Step 3: Import Sync

```bash
# Compare import style between existing and new file
head -15 src/services/UserService.ts    # existing imports
head -15 src/services/[NewService].ts   # new imports

# Common drift issues:
# ❌ New file uses `import type` but existing doesn't
# ❌ New file uses absolute paths but existing uses relative
# ❌ New file imports from different location (../../models vs ../models)
# ❌ New file adds a new library not already in package.json
```

Import checklist:
```
[ ] Import paths match depth convention (../models vs ../../models)
[ ] No new external packages added without team discussion
[ ] Type imports match style (import type vs import)
[ ] Import order matches (external → internal → types, or whatever exists)
[ ] Logger import matches existing logger usage
```

---

### Step 4: Naming Sync (detailed)

```bash
# Extract all identifier patterns from similar existing file
grep -n "const\|let\|function\|class\|interface\|type\|enum" \
  src/services/UserService.ts | head -30
# Compare to new file:
grep -n "const\|let\|function\|class\|interface\|type\|enum" \
  src/services/[NewService].ts | head -30
```

Naming checklist:
```
[ ] Variables: camelCase (matches existing)
[ ] Constants: UPPER_SNAKE_CASE (matches existing)
[ ] Private fields: _fieldName or #fieldName (matches existing)
[ ] Interface names: I-prefixed or plain (matches existing convention)
[ ] Type names: [Name]Type or plain (matches existing)
[ ] Async functions: no unnecessary async prefix in names
[ ] Boolean variables: isActive / hasPermission (matches existing)
[ ] Event names: 'user.created' or 'USER_CREATED' (matches existing)
```

---

### Step 5: API Contract Sync

For new API endpoints:
```bash
# Check route file conventions
cat src/routes/user.routes.ts     # existing route file pattern
cat src/routes/[new].routes.ts    # new route file

# Verify:
grep -n "router\.\(get\|post\|put\|patch\|delete\)" src/routes/user.routes.ts
# Compare middleware order:
# auth → validate → rateLimit → controller (match existing order)
```

API checklist:
```
[ ] URL follows existing convention (/api/v1/[resource] or /[resource])
[ ] HTTP methods match REST conventions used in codebase
[ ] Middleware order matches existing routes
[ ] Validation middleware applied (if existing routes use it)
[ ] Auth middleware applied on all protected routes
[ ] Route file registered in main router (app.ts / routes/index.ts)
[ ] Error responses match existing error format
[ ] Success responses match existing response envelope
```

---

### Step 6: Dependency Impact Check

Before submitting, run the dependency mapper:
```bash
# What does the new module import?
grep "^import\|^const.*require" src/[new-file].ts

# Could changing any of those imports break other things?
# For each imported module, check who else uses it
npx depcruise src --include-only "^src" \
  --output-type json | jq \
  '[.modules[] | select(.dependencies[].resolved | contains("[imported-module]")) | .source]'
```

---

## Sync Report Format

After running all checks, produce this report:

```markdown
# Sync Report: [NewFeature] in [ProjectName]

**Date:** [date]
**New files:** [list]
**Reviewed against:** [Codebase Map v[N]], [Pattern Card: backend]

---

## ✅ In Sync

| Check | Status | Notes |
|---|---|---|
| File naming | ✅ | orderService.ts matches camelCase convention |
| Controller pattern | ✅ | Uses asyncHandler, AppError, { success, data } |
| Service export | ✅ | export default new OrderService() |
| Test structure | ✅ | describe/it with factories, jest.mock |
| Import paths | ✅ | Relative paths at same depth as UserService |

---

## ❌ Out of Sync (fix before PR)

| Check | Found | Expected | Fix |
|---|---|---|---|
| Response format | `res.json(result)` | `res.json({ success: true, data: result })` | Wrap in envelope |
| Error throwing | `throw new Error('Not found')` | `throw new AppError('Not found', 404)` | Use AppError |
| Model table name | `tableName: 'Orders'` | `tableName: 'orders'` | Lowercase |

---

## ⚠️ Decisions Needed

| Issue | Options | Recommendation |
|---|---|---|
| No factory for Order model | Create one / use inline data | Create factory (matches existing test pattern) |
| Missing validator schema | Add to /validators / inline | Add OrderValidator.ts (matches existing) |

---

## Impact Analysis

Changed files: [list]
Files that import changed files: [list from dependency-mapper]
Risk level: Low / Medium / High
Suggested test additions: [list]
```

---

## Automated Sync Check (CI gate)

```yaml
# .github/workflows/sync-check.yml
name: Pattern Compliance Check
on: [pull_request]

jobs:
  sync-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check circular dependencies
        run: npx depcruise src --validate .dependency-cruiser.cjs

      - name: Check naming conventions
        run: |
          # Files in services/ must be camelCase
          find src/services -name "*.ts" | grep -vE "^[a-z][a-zA-Z]+\.ts$" \
            && echo "❌ Non-camelCase file in services/" && exit 1 || echo "✅ Naming OK"

      - name: Check for banned patterns
        run: |
          # No console.log in production code
          grep -rn "console\.log" src/ --include="*.ts" \
            && echo "❌ console.log found in src/" && exit 1 || echo "✅ No console.log"
          # No raw SQL outside db/
          grep -rn "sequelize\.query\|raw.*sql" src/ --include="*.ts" \
            | grep -v "src/db/" \
            && echo "❌ Raw SQL outside src/db/" && exit 1 || echo "✅ SQL placement OK"
```

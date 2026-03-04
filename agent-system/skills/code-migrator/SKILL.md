---
name: code-migrator
description: Use when refactoring codebases, migrating between frameworks/libraries, paying off tech debt, upgrading major versions, or moving from one architecture pattern to another. Triggers: "refactor", "migrate from", "upgrade", "tech debt", "modernize", "replace [library]", "move from X to Y", "rewrite", or when codebase patterns are inconsistent and need standardization.
---

# Code Migrator Skill

Plan and execute code migrations safely: tech debt payoff, framework upgrades, architecture changes. Always: assess before touching, migrate incrementally, keep tests green throughout.

---

## Migration Assessment First

Before writing a line of code, produce this assessment:

```markdown
## Migration Assessment: [What You're Migrating]

### Current State
- Technology: [what exists now]
- Coverage: [% test coverage — DO NOT migrate below 60%]
- Complexity: [file count, LOC, dependency count]
- Known issues: [existing bugs or debt in this area]

### Target State  
- Technology: [what it will be]
- Benefits: [why this migration is worth doing]
- Risks: [what could go wrong]

### Scope
- Files affected: [N files, list them]
- Database changes: [yes/no — if yes, migration plan needed]
- API changes: [breaking/non-breaking]
- Dependencies added/removed: [list]

### Effort
- Estimated hours: [N]
- Recommended batch size: [N files per PR]
- Rollback plan: [how to undo if something goes wrong]

### Go / No-Go
[ ] Test coverage ≥ 60% on affected code
[ ] CI pipeline is green before starting  
[ ] Rollback plan is documented
[ ] Team is aware and available to review PRs
```

---

## Migration Strategies

### 1. Strangler Fig (Safest — for large migrations)

```
Don't rewrite everything at once. Route traffic gradually to the new version.

Phase 1: New code lives alongside old code
  old/UserService.js  ← still in use
  new/UserService.ts  ← new version, not yet routed to

Phase 2: Route new requests to new code
  if (featureFlag('new-user-service')) {
    return newUserService.getUser(id);
  }
  return oldUserService.getUser(id);  // fallback

Phase 3: Migrate all consumers to new code
  Remove feature flag, delete old code

Benefits:
  - Always shippable
  - Easy rollback (flip flag)
  - Test new code in production gradually
```

### 2. Branch by Abstraction (for replacing dependencies)

```javascript
// Step 1: Create an abstraction interface
// interfaces/CacheProvider.js
class CacheProvider {
  async get(key) { throw new Error('Not implemented'); }
  async set(key, value, ttlSeconds) { throw new Error('Not implemented'); }
  async delete(key) { throw new Error('Not implemented'); }
}

// Step 2: Wrap existing implementation
// cache/RedisProvider.js — existing
class RedisProvider extends CacheProvider {
  async get(key) { return this.redis.get(key); }
  // ...
}

// Step 3: Build new implementation against interface
// cache/ElastiCacheProvider.js — new
class ElastiCacheProvider extends CacheProvider {
  async get(key) { return this.client.get(key); }
  // ...
}

// Step 4: Switch via config — no code change in consumers
const cache = config.useElastiCache
  ? new ElastiCacheProvider(config.elastiCache)
  : new RedisProvider(config.redis);
```

### 3. Parallel Run (for validating equivalence)

```javascript
// Run old and new implementations simultaneously, compare outputs
async function getUserWithValidation(id) {
  const [oldResult, newResult] = await Promise.allSettled([
    oldUserService.getUser(id),
    newUserService.getUser(id),
  ]);

  // Log any differences (don't fail — just monitor)
  if (oldResult.status === 'fulfilled' && newResult.status === 'fulfilled') {
    if (!deepEqual(oldResult.value, newResult.value)) {
      logger.warn('Migration validation: results differ', {
        userId: id,
        old: oldResult.value,
        new: newResult.value,
      });
    }
  }

  return oldResult.value; // Still return old result during validation phase
}
```

---

## Common Migration Patterns

### JavaScript → TypeScript

```bash
# Step 1: Install TypeScript (don't convert files yet)
npm install -D typescript @types/node ts-node
npx tsc --init

# Step 2: Set loose tsconfig to start (tighten over time)
# tsconfig.json
{
  "compilerOptions": {
    "strict": false,          // Start loose
    "allowJs": true,          // Allow .js alongside .ts
    "checkJs": false,         // Don't type-check .js yet
    "noImplicitAny": false    // Allow implicit any for now
  }
}

# Step 3: Rename files one by one: .js → .ts
# Fix type errors file by file, never all at once

# Step 4: Progressively tighten (after all files converted)
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

### Callbacks → Async/Await

```javascript
// ❌ Callback hell
function getUser(id, callback) {
  db.query('SELECT * FROM users WHERE id = $1', [id], (err, result) => {
    if (err) return callback(err);
    callback(null, result.rows[0]);
  });
}

// Step 1: Promisify first
const { promisify } = require('util');
const dbQuery = promisify(db.query.bind(db));

// Step 2: Then async/await
async function getUser(id) {
  const result = await dbQuery('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

// Migration rule: convert bottom-up (utilities first, then consumers)
```

### Express → Fastify (example framework migration)

```javascript
// Step 1: Run both servers temporarily (different ports)
// server-express.js → :3000 (production traffic)
// server-fastify.js  → :3001 (shadow traffic for testing)

// Step 2: Shadow traffic with comparison
nginx.upstream.app {
  server localhost:3000 weight=100;   // all traffic
}
nginx.upstream.shadow {
  server localhost:3001 weight=0;     // shadow — no user traffic
}

// Step 3: Gradually shift (5% → 25% → 50% → 100%)
nginx.upstream.app {
  server localhost:3000 weight=95;
  server localhost:3001 weight=5;
}
```

---

## Database Migration Safety

```sql
-- SAFE: Add nullable column (no downtime)
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- SAFE: Add column with DEFAULT (no downtime in Postgres 11+)
ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT false;

-- RISKY: Add NOT NULL without DEFAULT (locks table)
-- ❌ ALTER TABLE users ADD COLUMN required_field TEXT NOT NULL;

-- SAFE pattern for adding NOT NULL:
-- Step 1: Add nullable
ALTER TABLE users ADD COLUMN required_field TEXT;
-- Step 2: Backfill
UPDATE users SET required_field = 'default' WHERE required_field IS NULL;
-- Step 3: Add constraint (after backfill complete)
ALTER TABLE users ALTER COLUMN required_field SET NOT NULL;

-- Rename column safely (dual-write period):
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
-- Step 2: Backfill
UPDATE users SET full_name = name;
-- Step 3: Application writes both columns
-- Step 4: After all instances updated, drop old column
ALTER TABLE users DROP COLUMN name;
```

---

## Migration Checklist

```
Pre-migration:
  [ ] Test coverage ≥ 60% on files being changed
  [ ] CI green before starting
  [ ] Feature branch created (never migrate on main)
  [ ] Rollback plan documented
  [ ] Team notified (migration PRs get priority review)

Per-batch:
  [ ] Max 10-15 files per PR (reviewable size)
  [ ] Tests still pass after batch
  [ ] No functional changes mixed in (migration only)
  [ ] Linter/formatter applied

Post-migration:
  [ ] All old code deleted (not just commented out)
  [ ] Old dependency removed from package.json
  [ ] Documentation updated
  [ ] CI still green
  [ ] Performance baseline unchanged (run benchmarks)
```

---

## Output Files

```
output/docs/
  MIGRATION-[name]-plan.md     ← Assessment + phased plan
  MIGRATION-[name]-runbook.md  ← Step-by-step execution guide
output/code/
  [migrated files in place]
```

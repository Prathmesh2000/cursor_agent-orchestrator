---
name: "monolith-decomposer"
description: "Use when migrating a monolith to microservices or when extracting a bounded context into a standalone service. Triggers: \"break up monolith\", \"extract service\", \"strangler fig\", \"monolith to microservices\", \"service extraction\", \"bounded context\", \"decouple\", \"separate service\", \"split apart\", or when a module has grown to need independent deployment or scaling."
---


# Monolith Decomposer Skill

Safely extract services from a monolith using the strangler fig pattern. Zero-downtime migration with feature flags and dual-write until ready.

---

## Should You Decompose? (run this first)

```
READINESS CHECKLIST — need all ✅ before starting:
  [ ] Clear bounded context: module has stable interface (not tangled)
  [ ] Tangible scaling need: specific part needs 5×+ scale difference
  [ ] CI/CD: can deploy independently without all-hands
  [ ] Observability: distributed tracing, centralized logs already exist
  [ ] Team: ≥2 engineers who will own the new service long-term
  [ ] Time: extraction takes 4-8× longer than it looks
  [ ] Monolith has good test coverage on the module being extracted

STOP if any are missing — fix those first.

WRONG REASONS to decompose:
  ❌ "Microservices are the modern way"
  ❌ "We'll be able to scale better eventually"  
  ❌ "Each team should own their own service"
  ❌ A new engineer wants to build something "from scratch"
```

---

## The Strangler Fig Pattern (safe extraction in 6 phases)

```
Phase 1: Identify → Map the module's API surface (inputs/outputs/events)
Phase 2: Isolate  → Create internal interface in monolith (no behaviour change)
Phase 3: Mirror   → Build new service with same interface (dual running)
Phase 4: Route    → Feature flag to route % of traffic to new service
Phase 5: Migrate  → Move data, move 100% traffic, remove monolith code
Phase 6: Clean    → Remove dead code, update docs, write post-migration ADR
```

---

## Phase 1 — Identify the Extraction Surface

```bash
# Map everything the target module exposes and consumes

# 1. What does this module export? (its API surface)
grep -rn "export\|module.exports" src/[module]/ --include="*.ts"

# 2. Who calls into this module? (its dependents — blast radius)
grep -rn "import.*[module]\|require.*[module]" src/ --include="*.ts" | grep -v "src/[module]/"

# 3. What does this module call out to? (its dependencies)
grep -rn "import\|require" src/[module]/ --include="*.ts" | grep -v "src/[module]/"

# 4. What DB tables does this module own?
grep -rn "Model\|findByPk\|findOne\|create\|update\|destroy" src/[module]/ --include="*.ts"

# 5. What events does this module emit/consume?
grep -rn "emit\|publish\|subscribe\|on\(" src/[module]/ --include="*.ts"
```

**Extraction Surface Map:**

```markdown
## Module: [ModuleName]

### Inbound (what callers use)
| Method/Endpoint | Callers | Can extract? |
|---|---|---|
| UserService.getById(id) | OrderController, NotifService | Yes — stable interface |
| POST /users/:id/avatar | Mobile app, Web app | Yes — REST |
| User.created event | EmailService, AuditLog | Yes — event |

### Outbound (what this module depends on)
| Dependency | Type | Extraction complexity |
|---|---|---|
| AuthService | Internal service | Low — already clean interface |
| EmailService | Internal service | Low — fire-and-forget |
| payments DB table | DB dependency | HIGH — shared DB, needs migration |

### Data ownership
| Table | Currently shared with | Migration plan |
|---|---|---|
| users | orders (FK), profiles | Move to user-service DB, expose via API |
| user_profiles | — | Move entirely |
| sessions | auth module | Keep with auth or extract |
```

---

## Phase 2 — Isolate (Anti-corruption Layer in monolith)

Before touching the new service, create a clean interface boundary in the monolith:

```typescript
// src/interfaces/IUserService.ts — define the contract
export interface IUserService {
  getById(id: string): Promise<User>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  deactivate(id: string): Promise<void>;
}

// src/services/UserServiceAdapter.ts — implement against the interface
// This wraps the existing implementation — no behaviour change yet
import { UserService as LegacyUserService } from './legacy/UserService';

export class UserServiceAdapter implements IUserService {
  async getById(id: string): Promise<User> {
    // For now: just delegate to legacy
    return LegacyUserService.getById(id);
    // Later: delegate to new microservice via HTTP
  }
  // ...
}

// Update all callers to use the adapter (not the concrete service):
// Before: import UserService from '../services/UserService';
// After:  import { userService } from '../services/UserServiceAdapter';
```

This phase has zero behaviour change — just adds the interface layer. Ship this to production first.

---

## Phase 3 — Build New Service (mirror of monolith module)

```
New service structure (use service-template skill):
  [service-name]/
    src/
      routes/          ← same API surface as monolith module
      services/        ← same business logic
      models/          ← service-owned DB (separate database/schema)
      middleware/      ← auth validation (validate JWTs issued by auth service)
    tests/
    Dockerfile
    package.json
    .env.example
    README.md          ← service contract: API + events + data owned
```

The new service must:
1. Implement the EXACT SAME API surface as the interface defined in Phase 2
2. Have its OWN database (no shared DB)
3. Have health check endpoint (`GET /health`)
4. Emit the same events as the monolith module
5. Pass all integration tests before Phase 4 begins

---

## Phase 4 — Feature Flag Routing (gradual migration)

```typescript
// src/services/UserServiceAdapter.ts — updated for gradual migration
import { featureFlags } from '../lib/featureFlags';
import { LegacyUserService } from './legacy/UserService';
import { UserMicroserviceClient } from '../clients/UserMicroserviceClient';

export class UserServiceAdapter implements IUserService {
  async getById(id: string): Promise<User> {
    if (await featureFlags.isEnabled('user-service-extraction', { userId: id })) {
      // Route to new microservice
      return UserMicroserviceClient.getById(id);
    }
    // Fallback to monolith
    return LegacyUserService.getById(id);
  }
}
```

```
Migration phases (adjust % based on error rates):
  Week 1:  5% of traffic → new service (canary)
  Week 2: 25% if error rate < 0.1%
  Week 3: 50% if error rate < 0.1%
  Week 4: 100% → complete migration
  Week 5: Remove flag + legacy code
```

---

## Phase 5 — Data Migration

```sql
-- Strategy: Copy data to new DB, then cut over

-- 1. Create new service DB schema (identical to monolith tables)
-- 2. Initial bulk copy:
INSERT INTO user_service.users SELECT * FROM monolith.users;

-- 3. Dual-write during migration (write to both DBs):
-- Add dual-write in UserServiceAdapter:
-- await Promise.all([legacyUserService.create(data), userMicroserviceClient.create(data)]);

-- 4. Verify consistency:
SELECT COUNT(*) FROM monolith.users;          -- should match
SELECT COUNT(*) FROM user_service.users;      -- after sync

-- 5. Cut over: switch reads to new service, stop dual-write

-- 6. Post-cutover: remove FKs from monolith pointing to users table
```

---

## Phase 6 — Cleanup Checklist

```
After 100% traffic → new service, and stable for 1 week:

Code cleanup:
  [ ] Remove feature flag code from adapter
  [ ] Remove LegacyUserService import
  [ ] Remove UserServiceAdapter (callers now use HTTP client directly)
  [ ] Remove users table from monolith DB (after FK removal)
  [ ] Remove user-related models from monolith

Documentation:
  [ ] Update system architecture diagram (HLD)
  [ ] Write post-migration ADR (what went well, what to do differently)
  [ ] Update service catalog (README for new service)
  [ ] Update API gateway routing rules

Validation:
  [ ] E2E tests still pass
  [ ] No monolith code still references deleted module
  [ ] New service has runbook in output/docs/ops/
```

---

## Service Dependency Anti-Patterns (never do these)

```
❌ Services sharing a database — both write to same DB
   Fix: Each service owns its data. Share via API or events.

❌ Synchronous chain: A calls B calls C calls D
   Fix: Break chain with async events or flatten to direct calls.

❌ Circular calls: A calls B, B calls A
   Fix: Extract shared logic to C, or invert one relationship.

❌ "Distributed monolith": services deploy together, share libraries
   Fix: Each service has independent deploy pipeline.

❌ Too-fine-grained: "User Address Service", "User Phone Service"
   Fix: Stay at bounded-context level, not table level.
```

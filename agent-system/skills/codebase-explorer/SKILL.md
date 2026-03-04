---
name: codebase-explorer
description: Use FIRST whenever working in an existing repository. Triggers: "existing repo", "understand the codebase", "what patterns does this use", "how is this structured", "before I add X", "in sync with existing code", "Explore:", or ANY time a user asks to modify, extend, or add to code that already exists. Always run this before coding in an unfamiliar or existing codebase.
---

# Codebase Explorer Skill

Systematically read and understand an existing repository before writing any code. Produces a Codebase Map that all agents use to stay in sync with existing patterns, conventions, and architecture.

---

## The Core Rule

```
NEVER write code in an existing repo without first understanding:
  1. What tech stack and versions are in use
  2. How the codebase is structured (folder layout + responsibilities)
  3. What patterns and conventions are already established
  4. What naming conventions exist
  5. How existing similar features are implemented
  6. What tests look like and how they run
  7. What environment/config is needed
  8. What's broken or in-flight (open PRs, TODOs, known debt)

Violating this = writing code that conflicts with the codebase,
uses wrong patterns, ignores conventions, and causes review rejections.
```

---

## Exploration Process

### Step 1 — Entry Points (always start here)

```bash
# Read these files FIRST — they describe the project
cat README.md
cat package.json          # OR pyproject.toml / pom.xml / go.mod
cat .env.example
cat docker-compose.yml    # if present
cat Makefile              # if present
```

Extract from package.json / dependency file:
- Runtime + version (Node 20, Python 3.11, Go 1.22, Java 17)
- Framework + version (Express 4, FastAPI, Gin, Spring Boot)
- Key libraries (ORM, auth, cache, queue, test runner)
- Scripts: how to run, test, build, lint

---

### Step 2 — Structural Map

```bash
# Map the top-level structure
find . -maxdepth 2 -type f -name "*.ts" -o -name "*.js" \
  | grep -v node_modules | grep -v dist | head -60

# Or use tree if available
tree -L 3 --ignore node_modules --ignore .git
```

Build this map:

```
src/
  controllers/   → HTTP handlers, request parsing, response formatting
  services/      → Business logic, orchestration
  models/        → DB models, schemas, types
  routes/        → Route definitions, middleware application
  middleware/    → Auth, logging, validation, error handlers
  utils/         → Pure utility functions
  config/        → Environment, database, external services
  types/         → Shared TypeScript types/interfaces
tests/
  unit/          → Unit tests
  integration/   → Integration tests
  e2e/           → E2E tests
```

---

### Step 3 — Pattern Extraction (read 3-5 files per pattern)

For each layer, read existing files and extract the pattern:

#### Controller Pattern
```bash
# Read 2-3 existing controllers
cat src/controllers/UserController.ts
cat src/controllers/PostController.ts
```
Extract:
- How are requests parsed? (req.body directly / Joi / Zod / class-validator)
- How are responses shaped? (res.json() / ResponseHelper / envelope)
- How are errors thrown? (try/catch / asyncHandler wrapper / Express error middleware)
- How is auth accessed? (req.user / middleware injection / decorator)

#### Service Pattern
```bash
cat src/services/UserService.ts
```
Extract:
- Class or module? (class UserService / export function createUser)
- Are services instantiated? (new UserService() / singleton / DI container)
- How is DB accessed from service? (imported model / injected repo / ORM directly)
- How are errors handled? (throws / returns Result / returns null)

#### Model/Schema Pattern
```bash
cat src/models/User.ts
```
Extract:
- ORM in use: Sequelize / TypeORM / Prisma / Mongoose / raw SQL
- How are relations defined?
- What mixins/timestamps are standard?
- What validations are applied at model level?

#### Test Pattern
```bash
cat tests/unit/UserService.test.ts
cat tests/integration/UserRoutes.test.ts
```
Extract:
- Test runner (Jest / Vitest / Mocha / pytest / Go test)
- Test structure (describe/it / test / BDD)
- How are mocks done? (jest.mock / sinon / pytest fixtures)
- How is DB seeded for tests? (factory / fixtures / in-memory)
- Coverage thresholds (from package.json jest config)

---

### Step 4 — Convention Extraction

```bash
# Read linting config
cat .eslintrc.* 2>/dev/null || cat eslint.config.* 2>/dev/null
cat .prettierrc 2>/dev/null
cat tsconfig.json 2>/dev/null

# Read git hooks
cat .husky/pre-commit 2>/dev/null
cat .commitlintrc.* 2>/dev/null
```

Extract:
- Naming: camelCase / PascalCase / kebab-case (files vs classes vs functions)
- Import style: named vs default exports, import ordering
- Async style: async/await vs Promise chains
- Error throwing: custom error classes vs plain Error vs error codes
- Logging: console.log vs structured logger (pino/winston) — and how it's called

---

### Step 5 — Find the Most Similar Existing Feature

Before implementing anything new, find the closest existing analog:

```bash
# If adding "Order" feature, find similar existing feature (e.g. "Product")
grep -r "class ProductService\|ProductController\|ProductRoute" src/ --include="*.ts" -l
grep -r "createProduct\|updateProduct" src/ --include="*.ts" -l
```

Read ALL files for that analog feature (controller + service + model + routes + tests).
This is your implementation template — follow it exactly.

---

### Step 6 — Active State Check

```bash
# What's in progress / broken?
git status
git log --oneline -20
git stash list

# Open TODOs and known issues
grep -r "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" | head -20

# Failing tests
npm test 2>&1 | tail -30
```

---

## Codebase Map Output

After exploration, produce this document before doing any work:

```markdown
# Codebase Map: [Project Name]

Generated: [date]
Explorer: Codebase Intelligence Agent

---

## Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | 20.x | |
| Framework | Express | 4.18 | |
| ORM | Sequelize | 6.x | PostgreSQL dialect |
| Auth | JWT + bcrypt | — | Custom middleware |
| Validation | Joi | 17.x | Schemas in /validators |
| Testing | Jest + Supertest | — | ~72% coverage |
| Linting | ESLint + Prettier | — | Airbnb config |

---

## Folder Structure

```
src/
  controllers/   HTTP layer — parse request, call service, format response
  services/      Business logic — no HTTP awareness, no direct DB calls
  models/        Sequelize models only
  routes/        Router definitions — applies auth + validation middleware
  middleware/    authenticate.js, validate.js, errorHandler.js
  validators/    Joi schemas — one file per domain
  utils/         Pure functions: formatDate, generateToken, paginate
  config/        db.js, redis.js, env.js
tests/
  unit/          Jest, mocks via jest.mock(), factories in tests/factories/
  integration/   Supertest against real DB (test env in .env.test)
```

---

## Established Patterns

### Controller Pattern
```typescript
// Always use asyncHandler wrapper — no try/catch in controllers
// Response always wrapped: { success: true, data: ... } or { success: false, error: ... }
// Auth user from: req.user (set by authenticate middleware)

export const getUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await UserService.getById(req.params.id);
  res.json({ success: true, data: user });
});
```

### Service Pattern
```typescript
// Services are classes, instantiated once (singleton via module export)
// Throw AppError(message, statusCode) for handled errors
// DB access only via model imports (never raw queries in services)

class UserService {
  async getById(id: string): Promise<User> {
    const user = await User.findByPk(id);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }
}
export default new UserService();
```

### Route Pattern
```typescript
// router.method(path, [...middleware], controller)
// Validation always before controller
// Auth always first middleware if protected

router.get('/:id', authenticate, controller.getUser);
router.post('/', authenticate, validate(createUserSchema), controller.createUser);
```

### Test Pattern
```typescript
// describe('[Layer] [Name]', () => {
//   beforeEach: reset mocks, seed minimal data
//   it('should [behavior] when [condition]')
//   Use factories: createUser({ overrides })
// })
```

---

## Naming Conventions

| What | Convention | Example |
|---|---|---|
| Files | camelCase | userService.ts |
| Classes | PascalCase | UserService |
| Functions | camelCase | getById |
| Constants | UPPER_SNAKE | MAX_RETRY_COUNT |
| DB tables | snake_case | user_profiles |
| API routes | kebab-case | /user-profiles |
| Env vars | UPPER_SNAKE | DATABASE_URL |

---

## Analog Feature: [Most Similar to What We're Building]

For [new feature], the closest existing analog is [existing feature].
Implementation files to reference:
- src/controllers/[existing].ts → follow this structure exactly
- src/services/[existing].ts → follow this error handling
- src/models/[existing].ts → follow these Sequelize patterns
- tests/unit/[existing].test.ts → follow this test structure

---

## Active State

Tests: [passing/N failing] — [coverage %]
Known debt: [list TODOs relevant to our work]
In-progress: [recent commits or open PRs that affect our area]
Breaking changes in-flight: [if any]

---

## Constraints for This Work

Based on the codebase, all new code MUST:
  ✅ Use asyncHandler wrapper (not try/catch in controllers)
  ✅ Return { success: true, data } / { success: false, error }
  ✅ Throw AppError for handled errors
  ✅ Use Joi schemas in /validators for request validation
  ✅ Follow camelCase for files, PascalCase for classes
  ✅ Mirror the [existing feature] pattern for [new feature]
  ❌ NOT use raw SQL (use Sequelize)
  ❌ NOT add new dependencies without discussion
  ❌ NOT bypass validate middleware
```

---

## Integration with Other Agents

After Codebase Map is produced:

- **Senior/Junior Engineer** reads Constraints section before implementing
- **Code Reviewer** uses Established Patterns to validate new code matches conventions
- **Test Writer** uses Test Pattern to write matching test structure
- **DB Architect** uses ORM/model patterns before schema changes
- **API Designer** uses route/response patterns before adding endpoints

The Codebase Map lives in: `output/docs/codebase-map-[project].md`
Update it when significant patterns change.

---

## Codebase Sync Protocol (for ongoing work in existing repo)

This section governs how every agent must behave when working in code that already exists.

### The Sync Contract

Before writing a single line of code in an existing repo, every agent must answer:

```
1. What is the established pattern for this type of code?
   → Read 2-3 existing examples of the same type
   → Extract the exact structure, not a generic pattern

2. What naming does this codebase use?
   → File naming, class naming, function naming, constant naming
   → Variable naming conventions (is it userId or user_id or uid?)

3. What does "done" look like here?
   → What does a complete existing feature look like?
   → Controller + Service + Model + Routes + Tests + Validator?

4. What must NOT be introduced?
   → Dependencies the codebase explicitly avoids
   → Patterns already deprecated in this repo
   → New abstractions when existing ones already exist
```

### Reading Before Writing — mandatory steps

```bash
# Step 1: Find the most similar completed feature
# If building OrderService, find UserService or ProductService
grep -r "class.*Service" src/ --include="*.ts" -l
grep -r "export.*function.*Service\|export default.*Service" src/ -l

# Step 2: Read ALL files for that analog feature (not just service)
cat src/services/UserService.ts
cat src/controllers/UserController.ts
cat src/routes/user.routes.ts
cat src/validators/user.validator.ts
cat src/models/User.ts
cat tests/unit/UserService.test.ts
cat tests/integration/user.routes.test.ts

# Step 3: Extract the exact template — fill in this card:
```

### Pattern Card (fill before every implementation)

```
FEATURE: [What I'm building]
ANALOG: [Most similar existing feature]
ANALOG FILES: [list all files of the analog]

CONTROLLER PATTERN:
  - Wrapper used: [asyncHandler / try-catch / none]
  - Response format: [{ success, data } / { data } / plain]
  - Error format: [{ success, error } / { message } / throw]
  - Auth access: [req.user / req.auth / middleware injection]

SERVICE PATTERN:
  - Export style: [class singleton / named functions / default class]
  - Error throwing: [AppError / CustomError / plain Error / null return]
  - DB access: [model directly / repository / raw query]

MODEL PATTERN:
  - ORM: [Sequelize / TypeORM / Prisma / Mongoose / other]
  - Timestamps: [createdAt/updatedAt auto / manual / none]
  - Soft delete: [paranoid: true / deletedAt / hard delete]
  - Validation: [model-level / service-level / validator schema]

ROUTE PATTERN:
  - Middleware order: [auth → validate → controller / other]
  - Route prefix: [/api/v1/users / /users / other]
  - Versioning: [URL / header / none]

TEST PATTERN:
  - Framework: [Jest / Vitest / Mocha]
  - DB approach: [real DB test env / mocked / in-memory]
  - Mock style: [jest.mock / sinon / manual mocks]
  - Seed style: [factories / fixtures / beforeEach inline]
  - File location: [alongside source / tests/unit/ / __tests__/]

NAMING:
  - Files: [camelCase / PascalCase / kebab-case]
  - Classes: [PascalCase] Functions: [camelCase]
  - DB tables: [snake_case / camelCase]
  - Env vars: [UPPER_SNAKE]

NEW CODE MUST:
  ✅ [constraint 1 extracted from codebase]
  ✅ [constraint 2]
  ✅ [constraint 3]
NEW CODE MUST NOT:
  ❌ [what to avoid — from existing conventions]
  ❌ [deprecated patterns found in codebase]
```

### Drift Detection

After implementation, verify sync before submitting for review:

```bash
# Does new code follow naming conventions?
# Compare: existing file names vs new file names
ls src/services/ | head -5      # existing pattern
ls src/services/ | grep [new]   # new files match?

# Does new code use the same imports?
# Compare: existing service imports vs new service imports
head -15 src/services/UserService.ts     # existing imports
head -15 src/services/[NewService].ts    # new imports match?

# Does new code follow response format?
grep "res.json\|res.status" src/controllers/UserController.ts | head -5
grep "res.json\|res.status" src/controllers/[NewController].ts | head -5

# Do tests follow the same structure?
head -30 tests/unit/UserService.test.ts
head -30 tests/unit/[NewService].test.ts  # structure matches?
```

### Constraint Escalation

If the codebase has conflicting patterns (e.g., some files use try/catch, others use asyncHandler):
1. Document the conflict in the Codebase Map under "Inconsistencies"
2. Ask the user which pattern to follow for new code
3. Record the decision as an ADR
4. Do NOT silently pick one — this causes inconsistency debt


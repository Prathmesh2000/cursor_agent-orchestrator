---
name: pattern-extractor
description: Use when you need to deeply extract coding patterns, conventions, and architectural decisions from an existing codebase to ensure all new code is in perfect sync. Triggers: "extract patterns", "what pattern does this use", "mirror existing code", "code conventions", "how is X done in this repo", "match existing style", or when codebase-explorer output isn't detailed enough for a specific implementation. Goes deeper than codebase-explorer for a specific layer or pattern.
---

# Pattern Extractor Skill

Deep-mine specific patterns from an existing codebase. Produces exact, copy-ready templates that new code must follow — not generic patterns, but THIS codebase's specific patterns.

---

## Layer-Specific Extraction Playbooks

### Backend: Extract API Layer Patterns

```bash
# Collect ALL controllers
find src -name "*Controller*" -o -name "*controller*" | grep -v test | grep -v node_modules

# Read top 3 controllers completely
# Extract answers to these questions:
```

```
QUESTION → WHAT TO LOOK FOR IN FILES
─────────────────────────────────────────────────────────────────
1. Error handling approach?
   grep -n "try\|catch\|asyncHandler\|AppError" src/controllers/*.ts
   → Is it: try/catch in every controller?
   → Or: asyncHandler wrapper (no try/catch needed)?
   → Or: global error middleware catches thrown errors?

2. Response envelope?
   grep -n "res.json\|res.status" src/controllers/*.ts | head -20
   → Is it: res.json({ success: true, data: X })
   → Or: res.json({ data: X, meta: {...} })
   → Or: res.json(X)  ← flat, no envelope

3. Validation approach?
   grep -n "validate\|schema\|Joi\|Zod\|class-validator" src/ -r --include="*.ts" | head -10
   → Middleware-based: validate(schema) in route definition
   → Controller-based: schema.validate(req.body) in controller
   → Decorator-based: @Body() @ValidateNested() decorators

4. Auth injection?
   grep -n "req.user\|req.auth\|currentUser\|getUser" src/ -r --include="*.ts" | head -10
   → req.user (set by middleware)
   → req.auth.userId (JWT decoded directly)
   → Injected via constructor (DI framework)

5. Pagination?
   grep -n "page\|limit\|offset\|cursor\|skip\|take" src/ -r --include="*.ts" | head -10
   → page/limit query params
   → cursor-based
   → offset/limit
   → No pagination convention yet
```

**Output: Controller Template**

```typescript
// EXACT TEMPLATE extracted from THIS codebase — not generic
// Source: analyzed [list analyzed files]

// Import pattern (copy exact import style):
import { Request, Response } from 'express';
// [other imports as they appear in existing controllers]

// Handler pattern:
export const [actionName] = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Request parsing (match existing style):
  const { [field] } = req.[body|params|query];

  // Service call (match how existing controllers call services):
  const result = await [Service].[method]([args]);

  // Response format (match EXACTLY):
  res.[status(N).]json({ success: true, data: result });
});

// Error pattern — DO NOT add try/catch if asyncHandler is used
// Throw errors like existing code does:
// throw new AppError('[message]', [statusCode]);
```

---

### Backend: Extract Service Layer Patterns

```bash
# Read all service files
find src -name "*Service*" -o -name "*service*" | grep -v test | grep -v node_modules

# Extract service structure
head -50 src/services/[ExistingService].ts  # class vs functions
grep -n "export\|constructor\|static\|async" src/services/*.ts | head -30
grep -n "throw\|return null\|Result<\|Either<" src/services/*.ts | head -20
grep -n "transaction\|sequelize.transaction\|db.transaction" src/ -r | head -10
```

**Output: Service Template**

```typescript
// SERVICE TEMPLATE for this codebase
// Pattern: [class singleton / module functions / class with DI]

import { [ModelName] } from '../models/[ModelName]';
// [other imports matching existing services]

class [FeatureName]Service {
  // Method pattern (async/return type matches existing):
  async [methodName]([params]: [Types]): Promise<[ReturnType]> {
    // DB access pattern (matches existing):
    const record = await [Model].[finderMethod]({ where: { [field]: value } });

    // Not-found pattern (matches existing):
    if (!record) throw new AppError('[Name] not found', 404);
    // OR: if (!record) return null;
    // OR: if (!record) throw createError(404, '[Name] not found');

    return record;
  }

  // Transaction pattern (if used in codebase):
  async [mutatingMethod]([params]): Promise<[ReturnType]> {
    return [Model].sequelize!.transaction(async (t) => {
      // ...
    });
  }
}

export default new [FeatureName]Service();
// OR: export const [featureName]Service = new [FeatureName]Service();
// OR: export { [FeatureName]Service };
```

---

### Database: Extract Model Patterns

```bash
# Read all models
find src -path "*/models/*" -name "*.ts" | grep -v test

# Extract ORM patterns
head -80 src/models/[ExistingModel].ts
grep -n "DataTypes\|@Column\|@Entity\|Schema\|model.define\|extends Model" src/models/*.ts | head -20
grep -n "belongsTo\|hasMany\|hasOne\|belongsToMany\|@ManyToMany" src/models/*.ts | head -20
grep -n "paranoid\|deletedAt\|softDelete" src/models/*.ts | head -10
grep -n "validate\|allowNull\|unique\|defaultValue" src/models/*.ts | head -20
```

**Output: Model Template**

```typescript
// MODEL TEMPLATE for this codebase
// ORM: [Sequelize/TypeORM/Prisma] · Version: [X]

import { [imports matching existing models] } from 'sequelize';
import sequelize from '../config/database';

// Attributes interface (if TypeScript — match existing pattern):
interface [ModelName]Attributes {
  id: string;           // uuid / number / string — match existing
  [field]: [Type];
  createdAt?: Date;
  updatedAt?: Date;
}

class [ModelName] extends Model<[ModelName]Attributes> implements [ModelName]Attributes {
  declare id: string;
  declare [field]: [Type];
  // [timestamps as they appear in existing models]
}

[ModelName].init({
  id: {
    type: DataTypes.[UUID/INTEGER/STRING],
    primaryKey: true,
    // [match existing pk pattern: defaultValue/autoIncrement]
  },
  // [fields — match DataTypes usage in existing models]
}, {
  sequelize,
  modelName: '[ModelName]',
  tableName: '[table_name]',      // match snake_case convention
  timestamps: true,               // match existing
  paranoid: [true/false],         // match existing soft-delete pattern
  // [other options as they appear in existing models]
});

// Associations (match exactly how existing models define them):
export const associate = () => {
  [ModelName].belongsTo([OtherModel], { foreignKey: '[fk]', as: '[alias]' });
};

export default [ModelName];
```

---

### Frontend: Extract React Component Patterns

```bash
# Collect all existing components
find src -name "*.tsx" | grep -v test | grep -v stories | grep -v node_modules | head -20

# Extract component structure
head -60 src/components/[ExistingComponent]/[ExistingComponent].tsx
grep -n "useState\|useEffect\|useContext\|useSelector\|useQuery" src/components -r --include="*.tsx" | head -20
grep -n "interface.*Props\|type.*Props" src/components -r --include="*.tsx" | head -10
grep -n "export default\|export function\|export const" src/components -r --include="*.tsx" | head -20
```

**Output: Component Template**

```tsx
// COMPONENT TEMPLATE for this codebase
// Pattern: [functional component / class component]
// Styling: [MUI sx / CSS Modules / Tailwind / styled-components]
// State: [useState / Zustand / Redux]

import React[, { useState, useEffect }] from 'react';
// [imports matching existing component imports]

// Props interface (match existing naming style):
interface [ComponentName]Props {
  [prop]: [Type];
  [optionalProp]?: [Type];
}

// Component definition (match export style):
[export default function / export const] [ComponentName]({ [props] }: [ComponentName]Props) {
  // State (match hook usage in existing components):
  const [[state], set[State]] = useState<[Type]>([initial]);

  // Data fetching (match existing approach):
  const { data, isLoading, error } = useQuery({
    queryKey: ['[key]', [deps]],
    queryFn: () => [apiCall],
  });

  // Loading state (match existing loading component):
  if (isLoading) return <[LoadingComponent] />;
  if (error) return <[ErrorComponent] message={error.message} />;

  return (
    // JSX — match existing component JSX style and layout structure
  );
}
```

---

### Test: Extract Test Patterns

```bash
# Read 3+ test files at same layer (unit or integration)
cat tests/unit/[ExistingService].test.ts
cat tests/unit/[AnotherService].test.ts
cat tests/integration/[existingRoutes].test.ts

# Extract test structure
grep -n "describe\|it(\|test(\|beforeEach\|afterEach\|beforeAll" tests/ -r | head -30
grep -n "jest.mock\|jest.spyOn\|vi.mock\|sinon.stub" tests/ -r | head -20
grep -n "expect\|assert\|should\|toBe\|toEqual\|toMatchSnapshot" tests/ -r | head -20
grep -n "factory\|create\|seed\|fixture\|mockUser\|buildUser" tests/ -r | head -15
```

**Output: Test Template**

```typescript
// TEST TEMPLATE for this codebase
// Framework: [Jest/Vitest] · DB: [real/mocked/in-memory]
// Source: analyzed [test files analyzed]

import { [imports matching existing test imports] } from '[matching test framework]';
// [mock imports matching existing pattern]

// describe structure (match exactly):
describe('[Layer] [FeatureName]', () => {

  // Setup pattern (match existing beforeEach approach):
  beforeEach(async () => {
    jest.clearAllMocks();
    // OR: await db.truncate() for real DB tests
    // OR: factory setup
  });

  // Positive test (match 'it should...' naming):
  it('should [action] when [condition]', async () => {
    // Arrange (match factory/seed pattern):
    const [entity] = await [createFactory]({ [overrides] });

    // Act:
    const result = await [serviceMethod/apiCall];

    // Assert (match assertion style):
    expect(result).[matcher]([expected]);
  });

  // Negative/error test:
  it('should throw [error] when [bad condition]', async () => {
    await expect([action]).rejects.[toThrow/toMatchObject]({ [pattern] });
  });
});
```

---

## Cross-Language Pattern Extraction

### Python (FastAPI / Django)

```bash
# Entry points
cat pyproject.toml || cat requirements.txt
cat main.py || cat app/__init__.py
find . -name "*.py" | grep -v test | grep -v __pycache__ | grep -v venv | head -30

# Router/View pattern
grep -rn "@router\|@app.get\|@app.post\|class.*View\|def.*view" app/ | head -20
# Model pattern  
grep -rn "class.*Model\|class.*Base\|Column\|relationship" app/ | head -20
# Dependency injection pattern
grep -rn "Depends\|get_db\|get_current_user" app/ | head -10
```

### Go

```bash
cat go.mod
find . -name "*.go" | grep -v test | grep -v vendor | head -30
grep -rn "func.*Handler\|func.*Controller\|http.HandleFunc\|r.GET\|r.POST" . | head -20
grep -rn "type.*struct\|interface\|func.*Service\|func.*Repository" . | head -20
```

---

## Pattern Conflict Resolution

When you find conflicting patterns in the same codebase:

```
1. Document the conflict:
   "Found 2 patterns: [pattern A] in [files] vs [pattern B] in [files]"

2. Determine recency:
   git log --follow -p src/[newer-file].ts | head -20
   → Which is newer? The newer pattern is likely the intended direction.

3. Ask the user:
   "This codebase has two patterns for [concern]:
   A: [pattern A] — used in [N] files, last modified [date]
   B: [pattern B] — used in [N] files, last modified [date]
   Which should new code follow?"

4. Record in Codebase Map under "Pattern Decisions"
5. Write ADR if significant

NEVER: silently pick one without documenting
```

---

## Output

```
output/docs/
  codebase-map-[project].md        ← from codebase-explorer
  pattern-cards/
    backend-patterns.md            ← controller + service + model templates
    frontend-patterns.md           ← component + hook + test templates
    test-patterns.md               ← test structure template
    api-patterns.md                ← route + validation + response patterns
```

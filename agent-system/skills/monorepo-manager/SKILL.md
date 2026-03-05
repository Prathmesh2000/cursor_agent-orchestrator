---
name: "monorepo-manager"
description: "Use when setting up or managing a monorepo with multiple packages/apps. Triggers: \"monorepo\", \"turborepo\", \"nx\", \"pnpm workspaces\", \"shared packages\", \"multiple apps one repo\", \"workspace\", or when a project needs shared libraries across multiple services/frontends."
---


# Monorepo Manager Skill

Design and maintain production monorepos using Turborepo or Nx. Manage shared packages, coordinated builds, workspace dependencies, and CI caching.

---

## Monorepo Structure (Turborepo + pnpm)

```
my-monorepo/
├── apps/
│   ├── web/                  ← Next.js / React frontend
│   │   ├── package.json
│   │   └── src/
│   ├── api/                  ← Express / Node backend
│   │   ├── package.json
│   │   └── src/
│   └── admin/                ← Admin dashboard
│       └── package.json
│
├── packages/
│   ├── ui/                   ← Shared component library
│   │   ├── package.json      ← name: "@repo/ui"
│   │   └── src/
│   ├── config/               ← Shared configs (eslint, tsconfig)
│   │   ├── eslint-config/
│   │   └── tsconfig/
│   ├── types/                ← Shared TypeScript types
│   │   └── package.json      ← name: "@repo/types"
│   └── utils/                ← Shared utilities
│       └── package.json      ← name: "@repo/utils"
│
├── turbo.json                ← Build pipeline config
├── package.json              ← Root workspace config
└── pnpm-workspace.yaml
```

---

## Setup Files

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// package.json (root)
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=8"
  }
}
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],       // build deps first
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

---

## Shared Package Template

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@repo/config": "workspace:*",
    "typescript": "^5.0.0"
  }
}
```

```json
// apps/web/package.json — consuming shared package
{
  "name": "@repo/web",
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@repo/types": "workspace:*",
    "@repo/utils": "workspace:*"
  }
}
```

---

## Shared TypeScript Config

```json
// packages/config/tsconfig/base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true
  }
}

// packages/config/tsconfig/nextjs.json
{
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "jsx": "preserve",
    "incremental": true
  }
}
```

---

## CI Pipeline for Monorepo

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Turbo needs git history for affected detection

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      # Turbo remote caching with Vercel
      - name: Build (affected only)
        run: pnpm turbo run build --filter="...[origin/main]"
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

      - name: Test (affected only)
        run: pnpm turbo run test --filter="...[origin/main]"
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

---

## Dependency Rules (enforce in CI)

```
apps/ can import from packages/          ✅
packages/ can import from other packages/ ✅ (carefully)
packages/ cannot import from apps/       ❌ circular!
apps/ cannot import from other apps/     ❌ use packages/ instead

Enforce with: eslint-plugin-import boundary rules
```

---

## Common Commands

```bash
# Run only affected packages (fast)
pnpm turbo run test --filter="...[HEAD^1]"

# Run specific app
pnpm turbo run dev --filter="@repo/web"

# Run app + its deps
pnpm turbo run build --filter="@repo/web..."

# Add dependency to specific package
pnpm add react --filter="@repo/web"

# Add shared dep to root
pnpm add -w typescript -D

# List all workspaces
pnpm ls -r --depth=0
```

---

## Output Files

```
monorepo root:
  turbo.json
  pnpm-workspace.yaml
  package.json (root)
  packages/config/tsconfig/base.json
  packages/config/eslint-config/index.js
  .github/workflows/ci.yml
```

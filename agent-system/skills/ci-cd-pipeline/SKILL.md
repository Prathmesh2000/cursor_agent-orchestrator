---
name: ci-cd-pipeline
description: Use when setting up or maintaining CI/CD pipelines, GitHub Actions, GitLab CI, automated testing in CI, deployment pipelines, environment promotion, pipeline debugging, or release automation. Triggers: "CI/CD", "GitHub Actions", "pipeline", "automated deploy", "build pipeline", "test in CI", "deploy on merge", "release pipeline", "workflow file", or any continuous integration/delivery work.
---

# CI/CD Pipeline Skill

Design and implement production-grade CI/CD pipelines: automated testing, security scanning, deployment to multiple environments, release management, and pipeline observability.

---

## Pipeline Architecture

```
Developer pushes code
        │
        ▼
┌─── CI Pipeline ─────────────────────────────────────┐
│  1. Lint & type check        (fast feedback, 1-2m)   │
│  2. Unit tests               (isolated, 2-5m)        │
│  3. Integration tests        (with services, 5-10m)  │
│  4. Security scan            (SAST, deps, 3-5m)      │
│  5. Build & containerize     (Docker build, 3-5m)    │
│  6. E2E tests on staging     (full flow, 10-20m)     │
└──────────────────────────────────────────────────────┘
        │ all pass
        ▼
┌─── CD Pipeline ─────────────────────────────────────┐
│  dev   → auto-deploy on merge to main               │
│  staging → auto-deploy after CI passes              │
│  prod  → manual approval gate required              │
└──────────────────────────────────────────────────────┘
```

---

## GitHub Actions — Full Production Pipeline

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ─── Stage 1: Code Quality (runs in parallel) ──────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  # ─── Stage 2: Unit Tests ──────────────────────────────────
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage --ci
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: true
      - name: Coverage gate
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  # ─── Stage 3: Integration Tests ───────────────────────────
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run db:migrate:test
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test

  # ─── Stage 4: Security Scanning ───────────────────────────
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      # Dependency vulnerability audit
      - name: NPM Audit
        run: npm audit --audit-level=high
      # SAST - static analysis
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/nodejs
            p/jwt
            p/sql-injection
      # Secret scanning
      - name: TruffleHog secret scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

  # ─── Stage 5: Build & Push Image ──────────────────────────
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [lint, unit-tests, integration-tests, security]
    permissions:
      contents: read
      packages: write
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix={{branch}}-
            type=ref,event=branch
            type=semver,pattern={{version}}
      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─── Stage 6: Deploy to Staging ───────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: staging
      url: https://staging.yourapp.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          # Update image tag in k8s manifests or docker-compose
          # Example: update Kubernetes deployment
          kubectl set image deployment/app \
            app=${{ needs.build.outputs.image-tag }} \
            --namespace=staging
      - name: Wait for rollout
        run: kubectl rollout status deployment/app --namespace=staging --timeout=5m
      - name: Smoke test staging
        run: |
          sleep 10
          curl -f https://staging.yourapp.com/health || exit 1

  # ─── Stage 7: E2E on Staging ──────────────────────────────
  e2e-staging:
    name: E2E Tests on Staging
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps chromium
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: https://staging.yourapp.com
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      - name: Upload E2E artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  # ─── Stage 8: Deploy to Production (manual gate) ──────────
  deploy-prod:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [e2e-staging]
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://yourapp.com
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          kubectl set image deployment/app \
            app=${{ needs.build.outputs.image-tag }} \
            --namespace=production
      - name: Wait for rollout
        run: kubectl rollout status deployment/app --namespace=production --timeout=10m
      - name: Production health check
        run: |
          sleep 15
          curl -f https://yourapp.com/health || exit 1
      - name: Notify on success
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: '#deployments'
          slack-message: "✅ Deployed to production: ${{ github.sha }}"
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

---

## PR Pipeline (runs on every PR)

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  pr-title:
    name: PR Title Convention
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          types: |
            feat
            fix
            docs
            style
            refactor
            test
            chore
            ci

  size-check:
    name: PR Size Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check PR size
        uses: CodelyTV/pr-size-labeler@v1
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          xs_max_size: 10
          s_max_size: 50
          m_max_size: 200
          l_max_size: 500
          fail_if_xl: false

  danger:
    name: Danger JS
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx danger ci
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Pipeline Variables & Secrets Management

```yaml
# Environment variable strategy
# .github/workflows uses: secrets for sensitive, vars for config

# In workflow:
env:
  NODE_ENV: production
  LOG_LEVEL: info

# Access secrets:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  
# Access repo variables (non-sensitive config):
  API_BASE_URL: ${{ vars.API_BASE_URL }}
  REGION: ${{ vars.AWS_REGION }}
```

```bash
# Set secrets via GitHub CLI
gh secret set DATABASE_URL --body "postgresql://..."
gh secret set JWT_SECRET --body "$(openssl rand -base64 32)"

# Set for specific environment
gh secret set DATABASE_URL --env staging --body "postgresql://staging..."
gh secret set DATABASE_URL --env production --body "postgresql://prod..."
```

---

## Rollback Strategy

```yaml
# .github/workflows/rollback.yml
name: Rollback Production

on:
  workflow_dispatch:
    inputs:
      target_sha:
        description: 'Git SHA to roll back to'
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Get image for SHA
        id: get-image
        run: |
          IMAGE="${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main-${{ inputs.target_sha }}"
          echo "image=$IMAGE" >> $GITHUB_OUTPUT
      
      - name: Rollback deployment
        run: |
          kubectl set image deployment/app \
            app=${{ steps.get-image.outputs.image }} \
            --namespace=production
          kubectl rollout status deployment/app --namespace=production
      
      - name: Create rollback issue
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `🔄 Production rollback to ${context.sha}`,
              body: `Rolled back due to issue. Target SHA: ${{ inputs.target_sha }}`,
              labels: ['incident', 'rollback']
            })
```

---

## Pipeline Health Metrics

Track these to improve pipeline over time:

```markdown
## Pipeline KPIs

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Pipeline duration | < 15 min total | GitHub Actions insights |
| Success rate | > 95% | Failed runs / total runs |
| MTTR (pipeline) | < 30 min | Time from fail to green |
| Flaky test rate | < 2% | Tests that fail non-deterministically |
| Security scan findings | 0 critical/high | Semgrep/audit output |
| Coverage trend | ≥ 80%, improving | Codecov dashboard |
```

---

## Output Files

```
.github/
  workflows/
    ci-cd.yml         ← main pipeline
    pr-checks.yml     ← PR validation
    rollback.yml      ← manual rollback
    release.yml       ← release tagging
  CODEOWNERS          ← who reviews what
output/docs/
  pipeline-runbook.md ← how to debug failures
```

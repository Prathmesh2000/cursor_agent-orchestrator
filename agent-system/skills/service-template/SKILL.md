---
name: service-template
description: Use when creating a new microservice from scratch that needs to match organizational standards and patterns. Triggers: "new service", "create service", "service scaffold", "service boilerplate", "service template", "new microservice", or when bootstrapping any standalone deployable service. Produces a complete, runnable service skeleton in sync with existing org patterns.
---

# Service Template Skill

Generate a complete, production-ready microservice scaffold that matches your organization's existing patterns — not a generic template.

---

## Pre-scaffold: Read Org Patterns First

```bash
# Before generating, read an existing service to extract org patterns
# If no microservices exist yet, read the monolith's established patterns

ls services/ 2>/dev/null || echo "No existing services — reading monolith"

# Read the most complete existing service
cat services/[existing-service]/package.json
cat services/[existing-service]/src/app.ts
cat services/[existing-service]/Dockerfile
cat services/[existing-service]/src/middleware/
cat services/[existing-service]/src/routes/
```

Extract from existing service:
- Framework version (Express 4 / Fastify 4 / NestJS 10)
- Auth validation approach (JWT validate middleware)
- Error handler shape (same as monolith? or different)
- Health check format (`GET /health` response shape)
- Logger library (pino / winston)
- Config management (dotenv / envalid / convict)
- Test setup (Jest config, coverage thresholds)
- Docker base image (node:20-alpine / node:20-slim)
- Port convention (3000 / 8080 / per-service)

---

## Service Scaffold (Node.js + Express + TypeScript)

```
[service-name]/
├── src/
│   ├── app.ts                ← Express setup, middleware, routes
│   ├── server.ts             ← HTTP server start (separate from app)
│   ├── routes/
│   │   ├── index.ts          ← Route registrations
│   │   ├── health.routes.ts  ← GET /health, GET /health/ready
│   │   └── [feature].routes.ts
│   ├── controllers/
│   │   └── [Feature]Controller.ts
│   ├── services/
│   │   └── [Feature]Service.ts
│   ├── models/               ← Service-owned DB models only
│   │   └── [Entity].ts
│   ├── middleware/
│   │   ├── authenticate.ts   ← Validates JWT from auth service
│   │   ├── errorHandler.ts   ← Global error handler
│   │   ├── requestLogger.ts  ← Structured request logging
│   │   └── validate.ts       ← Request validation middleware
│   ├── clients/              ← HTTP clients for other services
│   │   └── [OtherService]Client.ts
│   ├── events/               ← Event publishers/consumers
│   │   ├── publishers/
│   │   └── consumers/
│   ├── config/
│   │   ├── env.ts            ← Validated env vars (envalid)
│   │   ├── database.ts       ← DB connection
│   │   └── redis.ts          ← Cache/pubsub (if needed)
│   └── types/
│       └── index.ts          ← Service-wide types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── helpers/
│       ├── factories.ts
│       └── testServer.ts
├── .env.example
├── .env.test
├── Dockerfile
├── docker-compose.yml        ← Local dev with dependencies
├── package.json
├── tsconfig.json
└── README.md                 ← Service contract (required)
```

---

## Core Files

### src/app.ts

```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { json } from 'body-parser';
import pino from 'pino-http';
import { routes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

export function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({ origin: env.ALLOWED_ORIGINS?.split(','), credentials: true }));

  // Parsing
  app.use(json({ limit: '1mb' }));

  // Logging
  app.use(pino({ logger: require('./config/logger') }));

  // Routes
  app.use('/', routes);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
```

### src/server.ts

```typescript
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';

async function start() {
  try {
    await connectDatabase();
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, service: env.SERVICE_NAME }, 'Service started');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down gracefully');
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  } catch (err) {
    logger.error(err, 'Failed to start service');
    process.exit(1);
  }
}

start();
```

### src/config/env.ts

```typescript
import { cleanEnv, str, num, bool, makeValidator } from 'envalid';

const url = makeValidator((v) => {
  try { new URL(v); return v; } catch { throw new Error('Invalid URL'); }
});

export const env = cleanEnv(process.env, {
  NODE_ENV:      str({ choices: ['development', 'test', 'production'] }),
  PORT:          num({ default: 3000 }),
  SERVICE_NAME:  str({ default: '[service-name]' }),

  // Database
  DATABASE_URL:  str(),

  // Auth
  JWT_SECRET:    str(),
  JWT_ISSUER:    str({ default: 'myapp' }),

  // Inter-service (add as needed)
  AUTH_SERVICE_URL: url(),

  // Optional
  REDIS_URL:     str({ default: '' }),
  LOG_LEVEL:     str({ default: 'info', choices: ['debug','info','warn','error'] }),
  ALLOWED_ORIGINS: str({ default: '' }),
});
```

### src/routes/health.routes.ts

```typescript
import { Router } from 'express';
import { sequelize } from '../config/database';
import { redis } from '../config/redis';

const router = Router();

// Liveness — is the process alive?
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: process.env.SERVICE_NAME, uptime: process.uptime() });
});

// Readiness — can it handle traffic? (checks DB + dependencies)
router.get('/health/ready', async (req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    await sequelize.authenticate();
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  if (process.env.REDIS_URL) {
    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ready' : 'not_ready', checks });
});

export default router;
```

### src/clients/[OtherService]Client.ts

```typescript
// Inter-service HTTP client — always typed, always with timeout + retry
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ServiceError } from '../middleware/errorHandler';

class AuthServiceClient {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: env.AUTH_SERVICE_URL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': env.SERVICE_NAME,
      },
    });

    // Retry on network errors and 5xx (not 4xx)
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (err) =>
        axiosRetry.isNetworkError(err) ||
        (err.response?.status ? err.response.status >= 500 : false),
    });

    // Log all inter-service calls
    this.client.interceptors.response.use(
      (r) => { logger.debug({ url: r.config.url, status: r.status }, 'Service call'); return r; },
      (e) => { logger.error({ url: e.config?.url, status: e.response?.status }, 'Service call failed'); return Promise.reject(e); }
    );
  }

  async validateToken(token: string): Promise<{ userId: string; role: string }> {
    try {
      const { data } = await this.client.post('/auth/validate', { token });
      return data;
    } catch (err: any) {
      if (err.response?.status === 401) throw new ServiceError('Invalid token', 401);
      throw new ServiceError('Auth service unavailable', 503);
    }
  }
}

export const authServiceClient = new AuthServiceClient();
```

---

## Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Security: no root, read-only where possible
USER appuser

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

---

## Service README Template (required — this is the service contract)

```markdown
# [Service Name]

**Owner:** [team]
**Port:** [N]
**Status:** Active

## Responsibility

[1-2 sentences: exactly what this service does and what it owns]

## API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /health | No | Liveness check |
| GET | /health/ready | No | Readiness check |
| GET | /[resource] | JWT | List [resources] |
| POST | /[resource] | JWT | Create [resource] |

## Events Published

| Event | Trigger | Payload |
|---|---|---|
| [resource].created | On create | { id, [fields], timestamp } |
| [resource].deleted | On delete | { id, timestamp } |

## Events Consumed

| Event | Source Service | Handler |
|---|---|---|
| user.deactivated | user-service | Delete user's [resources] |

## Data Owned

| Table/Collection | Description |
|---|---|
| [table] | [what it stores] |

## Dependencies

| Service | Purpose | Required? |
|---|---|---|
| auth-service | JWT validation | Yes |
| [other] | [purpose] | Yes/No |

## Local Dev

\`\`\`bash
cp .env.example .env
docker compose up -d     # start dependencies
npm install
npm run dev
\`\`\`

## Tests

\`\`\`bash
npm test                 # unit + integration
npm run test:coverage    # with coverage report
\`\`\`
```

---

## Output

```
services/[service-name]/
  src/            (all source files)
  tests/          (unit + integration)
  Dockerfile
  docker-compose.yml
  package.json
  tsconfig.json
  .env.example
  README.md       ← service contract
```

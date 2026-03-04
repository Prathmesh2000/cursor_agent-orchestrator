---
name: devops-engineer
description: Use for infrastructure setup, containerization, environment configuration, monitoring, logging, scaling, or production operations. Triggers: "Docker", "deploy", "infrastructure", "kubernetes", "environment setup", "production config", "monitoring", "logs", "scaling", "nginx", "reverse proxy", "environment variables", or any ops/infrastructure task.
---

# DevOps Engineer Skill

Design and implement production infrastructure: containerization, environment management, monitoring, logging, scaling, and production operations.

---

## Docker

### Production Dockerfile (Node.js)

```dockerfile
# Multi-stage build — separate build and runtime
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# ── Runtime stage (minimal image) ────────────────────────────
FROM node:20-alpine AS runtime

# Security: don't run as root
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001

WORKDIR /app

# Copy only what's needed
COPY --from=builder --chown=nodeapp:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeapp:nodejs /app/package.json ./package.json

USER nodeapp

EXPOSE 3000

# Healthcheck so Docker/K8s knows when app is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### Docker Compose (Full Stack)

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build:
      context: .
      target: runtime
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot-www:/var/www/certbot
    depends_on:
      - app
    networks:
      - app-network

volumes:
  postgres-data:
  redis-data:
  certbot-www:

networks:
  app-network:
    driver: bridge
```

---

## Environment Management

### `.env` Files Structure

```bash
# .env.example — commit this (template, no secrets)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/myapp_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-32-char-random-string
JWT_REFRESH_SECRET=replace-with-different-32-char-string
STRIPE_SECRET_KEY=sk_test_replace_me
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# .env.development — local dev (gitignored, shared via secure channel)
# .env.staging    — staging (managed in CI/CD secrets)
# .env.production — production (managed in secrets manager, never in git)
```

### Secret Rotation Checklist

```
- [ ] All secrets in environment variables (never in code)
- [ ] .env.* files in .gitignore (verify with: git check-ignore .env)
- [ ] Staging and production use different secrets
- [ ] Secrets rotated after any team member leaves
- [ ] Production secrets in secrets manager (AWS Secrets Manager / Vault)
- [ ] DB passwords are randomly generated (32+ chars)
- [ ] API keys have minimum required permissions
```

---

## Nginx Configuration

```nginx
# nginx/nginx.conf
worker_processes auto;

events {
  worker_connections 1024;
}

http {
  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;
  limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;

  upstream app {
    server app:3000;
    keepalive 32;
  }

  # HTTP → HTTPS redirect
  server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDH+AESGCM:ECDH+AES256:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API routes with rate limiting
    location /api/auth/ {
      limit_req zone=auth burst=10 nodelay;
      proxy_pass http://app;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
      limit_req zone=api burst=50 nodelay;
      proxy_pass http://app;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_read_timeout 60s;
    }

    # Static assets with caching
    location / {
      proxy_pass http://app;
      proxy_cache_valid 200 1d;
      add_header Cache-Control "public, immutable, max-age=86400";
    }

    # Health check — no rate limiting
    location /health {
      proxy_pass http://app;
      access_log off;
    }
  }
}
```

---

## Monitoring & Logging

### Application Health Endpoint

```javascript
// src/routes/health.routes.js
const db = require('../database');
const redis = require('../redis');

router.get('/health', async (req, res) => {
  const checks = await Promise.allSettled([
    db.authenticate().then(() => ({ db: 'ok' })),
    redis.ping().then(() => ({ redis: 'ok' })),
  ]);

  const status = {
    status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || 'unknown',
    checks: {
      database: checks[0].status === 'fulfilled' ? 'ok' : 'error',
      redis: checks[1].status === 'fulfilled' ? 'ok' : 'error',
    },
  };

  const httpStatus = status.status === 'healthy' ? 200 : 503;
  res.status(httpStatus).json(status);
});
```

### Structured Logging (Pino)

```javascript
// src/utils/logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: ['req.headers.authorization', '*.password', '*.token', '*.secret'],
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'my-api',
    version: process.env.APP_VERSION,
    env: process.env.NODE_ENV,
  },
});

// Request logging middleware
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      type: 'request',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      userId: req.user?.id,
      requestId: req.id,
    });
  });
  next();
}

module.exports = { logger, requestLogger };
```

---

## Production Readiness Checklist

```
Infrastructure:
  - [ ] App runs as non-root user in container
  - [ ] Multi-stage Docker build (no dev deps in prod image)
  - [ ] Health check endpoint configured
  - [ ] Graceful shutdown handling (SIGTERM)
  - [ ] Resource limits set (CPU, memory)

Security:
  - [ ] HTTPS enforced (HTTP redirects to HTTPS)
  - [ ] Security headers present (use securityheaders.com to verify)
  - [ ] Rate limiting on all public endpoints
  - [ ] Secrets in environment, not code
  - [ ] No debug mode in production

Reliability:
  - [ ] Database connection pooling configured
  - [ ] Redis connection retry logic
  - [ ] Retry with backoff for external API calls
  - [ ] Circuit breaker for dependencies
  - [ ] Restart policy: always / unless-stopped

Observability:
  - [ ] Structured JSON logging
  - [ ] Sensitive fields redacted from logs
  - [ ] Error tracking (Sentry or similar)
  - [ ] Uptime monitoring (ping from outside)
  - [ ] Database slow query logging

Backup:
  - [ ] Database backup scheduled (daily minimum)
  - [ ] Backup restoration tested
  - [ ] Point-in-time recovery configured
```

---

## Graceful Shutdown

```javascript
// src/index.js — handle shutdown properly
const server = app.listen(PORT);

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new requests
  server.close(async () => {
    try {
      await db.close();          // Close DB connections
      await redis.quit();        // Close Redis connections
      console.log('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 30s if graceful fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

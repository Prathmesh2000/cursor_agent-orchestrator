---
name: "api-gateway-design"
description: "Use when designing or implementing an API gateway for a microservice system. Triggers: \"API gateway\", \"gateway\", \"BFF\", \"backend for frontend\", \"request aggregation\", \"service routing\", \"gateway pattern\", \"API composition\", \"cross-cutting concerns\", \"edge layer\", or when multiple microservices need to be exposed through a unified entry point."
---


# API Gateway Design Skill

Design and implement API gateways: routing, auth, rate limiting, request aggregation, BFF pattern, and gateway-level observability.

---

## Gateway Decision: When and What Kind

```
Do you need a gateway?
  Single service           → No gateway. Direct access is fine.
  2-3 services, internal   → Thin router only (no business logic)
  Many services, public    → Full gateway with auth + rate limit + aggregation
  Different client types   → BFF pattern (separate gateway per client type)

Gateway types:
  Pass-through router:     Just routes requests to right service. Minimal logic.
  API composition:         Aggregates calls to multiple services into one response.
  BFF (Backend for Frontend): Tailored per client (mobile/web/partner).
  Service mesh sidecar:    Istio/Envoy — handles service-to-service, not client-facing.
```

---

## Express Gateway (Node.js, lightweight)

```typescript
// gateway/src/app.ts
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { authenticate } from './middleware/authenticate';
import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { correlationId } from './middleware/correlationId';
import { circuitBreaker } from './middleware/circuitBreaker';

const app = express();

// ─── Global middleware (runs for EVERY request) ───────────────────
app.use(correlationId);      // inject X-Correlation-ID
app.use(requestLogger);      // structured request/response log

// ─── Route table ──────────────────────────────────────────────────
const services = {
  users:     { url: process.env.USER_SERVICE_URL!,     prefix: '/api/users' },
  orders:    { url: process.env.ORDER_SERVICE_URL!,    prefix: '/api/orders' },
  catalog:   { url: process.env.CATALOG_SERVICE_URL!,  prefix: '/api/catalog' },
  payments:  { url: process.env.PAYMENT_SERVICE_URL!,  prefix: '/api/payments' },
  search:    { url: process.env.SEARCH_SERVICE_URL!,   prefix: '/api/search' },
};

// ─── Public routes (no auth) ──────────────────────────────────────
app.use('/api/catalog',
  rateLimiter({ windowMs: 60_000, max: 300 }),
  createProxyMiddleware({ target: services.catalog.url, changeOrigin: true }),
);

app.use('/api/search',
  rateLimiter({ windowMs: 60_000, max: 100 }),
  createProxyMiddleware({ target: services.search.url, changeOrigin: true }),
);

// ─── Auth endpoints (rate limited, no auth required) ──────────────
app.use('/api/auth',
  rateLimiter({ windowMs: 15 * 60_000, max: 20 }),  // strict: 20/15min
  createProxyMiddleware({ target: services.users.url, changeOrigin: true }),
);

// ─── Protected routes (auth required) ────────────────────────────
const protected_routes = [
  { path: '/api/users',    target: services.users.url,    rateLimit: 100 },
  { path: '/api/orders',   target: services.orders.url,   rateLimit: 60 },
  { path: '/api/payments', target: services.payments.url, rateLimit: 20 },
];

protected_routes.forEach(({ path, target, rateLimit: max }) => {
  app.use(
    path,
    rateLimiter({ windowMs: 60_000, max }),          // 1. Rate limit
    authenticate,                                     // 2. Verify JWT
    circuitBreaker(target),                           // 3. Circuit break
    createProxyMiddleware({
      target,
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req: any) => {
          // Forward user identity to downstream service
          proxyReq.setHeader('X-User-Id', req.user.id);
          proxyReq.setHeader('X-User-Role', req.user.role);
          proxyReq.setHeader('X-Correlation-Id', req.correlationId);
          // Remove Authorization header — downstream trusts X-User-Id
          proxyReq.removeHeader('Authorization');
        },
        error: (err, req, res: any) => {
          res.status(502).json({ error: 'Service unavailable', correlationId: (req as any).correlationId });
        },
      },
    }),
  );
});

export default app;
```

---

## Gateway Middleware

```typescript
// middleware/correlationId.ts
import { v4 as uuid } from 'uuid';

export const correlationId = (req: any, res: any, next: any) => {
  req.correlationId = req.headers['x-correlation-id'] ?? uuid();
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
};

// middleware/authenticate.ts (gateway validates JWT, passes user claims downstream)
import jwt from 'jsonwebtoken';

export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as any;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// middleware/requestLogger.ts
import pino from 'pino';
const logger = pino();

export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency: Date.now() - start,
      correlationId: req.correlationId,
      userId: req.user?.id,
    });
  });
  next();
};

// middleware/circuitBreaker.ts
import CircuitBreaker from 'opossum';

const breakers = new Map<string, CircuitBreaker<any>>();

export const circuitBreaker = (targetUrl: string) => {
  return (req: any, res: any, next: any) => {
    // Circuit breaker tracks error rate per target service
    let breaker = breakers.get(targetUrl);
    if (!breaker) {
      breaker = new CircuitBreaker(async () => {}, {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        name: targetUrl,
      });
      breaker.on('open', () => logger.error({ service: targetUrl }, 'Circuit OPEN'));
      breakers.set(targetUrl, breaker);
    }

    if (breaker.opened) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        correlationId: req.correlationId,
      });
    }
    next();
  };
};
```

---

## Request Aggregation (BFF pattern)

```typescript
// gateway/src/aggregators/checkoutAggregator.ts
// Aggregates multiple service calls into one response (reduces round trips)

interface CheckoutPageData {
  cart: Cart;
  user: UserProfile;
  savedAddresses: Address[];
  paymentMethods: PaymentMethod[];
  shippingOptions: ShippingOption[];
}

export async function getCheckoutPageData(
  userId: string,
  cartId: string,
  correlationId: string
): Promise<CheckoutPageData> {
  // Fire all calls in parallel — don't serialize independent calls
  const [cart, user, shippingOptions] = await Promise.all([
    cartService.getCart(cartId, { correlationId }),
    userService.getProfile(userId, { correlationId }),
    shippingService.getOptions({ correlationId }),
  ]);

  // These depend on user being available
  const [savedAddresses, paymentMethods] = await Promise.all([
    userService.getAddresses(userId, { correlationId }),
    paymentService.getSavedMethods(userId, { correlationId }),
  ]);

  return { cart, user, savedAddresses, paymentMethods, shippingOptions };
}

// Route handler:
router.get('/api/bff/checkout/:cartId',
  authenticate,
  async (req: any, res) => {
    try {
      const data = await getCheckoutPageData(
        req.user.id, req.params.cartId, req.correlationId
      );
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message, correlationId: req.correlationId });
    }
  }
);
```

---

## BFF Pattern (Backend for Frontend)

```
Mobile BFF    (gateway/mobile/)   → optimized payloads for mobile constraints
Web BFF       (gateway/web/)      → rich data for SPA
Partner API   (gateway/partner/)  → stable, versioned API for third-party integrations

Each BFF:
  - Has its own aggregation logic for its client's needs
  - Has its own rate limits (mobile is more lenient; partner API is strict)
  - Has its own authentication strategy (mobile: refresh tokens; partner: API keys)
  - Does NOT share code with other BFFs (coupling risk)
```

```typescript
// Mobile BFF: smaller payloads
router.get('/api/mobile/products/:id', authenticate, async (req, res) => {
  const product = await catalogService.getProduct(req.params.id);
  // Strip large fields mobile doesn't need
  res.json({
    id: product.id,
    name: product.name,
    price: product.price,
    thumbnailUrl: product.images[0]?.thumbnail,  // mobile: thumbnail only
    inStock: product.stockLevel > 0,
  });
});

// Web BFF: full data
router.get('/api/web/products/:id', authenticate, async (req, res) => {
  const [product, reviews, recommendations] = await Promise.all([
    catalogService.getProduct(req.params.id),
    reviewService.getForProduct(req.params.id, { limit: 5 }),
    recommendationService.getRelated(req.params.id, { limit: 6 }),
  ]);
  res.json({ product, reviews, recommendations });  // one round trip
});
```

---

## Gateway Configuration (environment)

```env
# .env
PORT=3000
JWT_SECRET=your-secret-here
NODE_ENV=production

# Downstream services
USER_SERVICE_URL=http://user-service:3001
ORDER_SERVICE_URL=http://order-service:3002
CATALOG_SERVICE_URL=http://catalog-service:3003
PAYMENT_SERVICE_URL=http://payment-service:3004
SEARCH_SERVICE_URL=http://search-service:3005

# Rate limits (requests per minute)
RATE_LIMIT_PUBLIC=300
RATE_LIMIT_AUTH=20
RATE_LIMIT_API=100

# Circuit breaker
CB_TIMEOUT_MS=5000
CB_ERROR_THRESHOLD=50
CB_RESET_TIMEOUT_MS=30000
```

---

## Gateway Responsibility Rules

```
Gateway SHOULD handle:
  ✅ SSL termination
  ✅ JWT validation (extract user claims, forward as headers)
  ✅ Rate limiting (per IP and per user)
  ✅ Request logging with correlation ID
  ✅ Circuit breaking per downstream service
  ✅ CORS headers
  ✅ Request aggregation / BFF transformations
  ✅ Response compression (gzip)
  ✅ API versioning routing (/v1/ → old service, /v2/ → new service)

Gateway MUST NOT handle:
  ❌ Business logic (no if/else about orders, users, etc.)
  ❌ Direct DB access
  ❌ Complex transformations (only aggregation, not data manipulation)
  ❌ Service-specific error handling
  ❌ Authorization checks (who can do what — that's the service's job)
  ❌ Caching business data (caching infra is fine, cache-control headers OK)
```

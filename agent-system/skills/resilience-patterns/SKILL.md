---
name: "resilience-patterns"
description: "Use when designing fault-tolerant distributed systems or implementing resilience in inter-service communication. Triggers: \"circuit breaker\", \"retry\", \"timeout\", \"bulkhead\", \"fallback\", \"resilience\", \"fault tolerance\", \"cascade failure\", \"service unavailable\", \"degraded mode\", \"rate limiting\", \"backpressure\", \"chaos engineering\", or any pattern protecting services from failures of their dependencies."
---


# Resilience Patterns Skill

Implement production resilience: circuit breakers, retry with backoff, timeouts, bulkheads, fallbacks, and graceful degradation. Every distributed system call needs these.

---

## The Resilience Decision Matrix

```
For every inter-service call, decide:

Timeout?    Always. No call without a deadline. Default: 3s.
Retry?      Only for transient failures (5xx, network). Never for 4xx.
Circuit?    Yes, for any dependency you don't control or that can be slow.
Fallback?   If there's a meaningful degraded experience. Not always possible.
Bulkhead?   For high-traffic services with slow dependencies.
Cache?      If data can be slightly stale. Massive resilience improvement.

Retry + Circuit Breaker together:
  Retry handles transient blips (single failed request)
  Circuit Breaker handles sustained outages (stop hammering a dead service)
  Both are needed. Neither replaces the other.
```

---

## Circuit Breaker (Node.js with opossum)

```bash
npm install opossum
npm install --save-dev @types/opossum
```

```typescript
// lib/circuitBreaker.ts
import CircuitBreaker from 'opossum';

// Default options for all external calls
const DEFAULT_OPTIONS = {
  timeout: 3000,            // 3s — fail request if takes longer
  errorThresholdPercentage: 50,  // open circuit if 50% of requests fail
  resetTimeout: 30000,      // try again after 30s
  volumeThreshold: 5,       // min requests before calculating error %
  rollingCountTimeout: 10000, // sliding window: 10s
};

type ServiceFn<T> = (...args: any[]) => Promise<T>;

export function createBreaker<T>(
  fn: ServiceFn<T>,
  name: string,
  options: Partial<typeof DEFAULT_OPTIONS> = {}
): CircuitBreaker<T> {
  const breaker = new CircuitBreaker(fn, { ...DEFAULT_OPTIONS, ...options, name });

  // Observability
  breaker.on('open',    () => console.warn(`⚡ Circuit OPEN: ${name} — stopping requests`));
  breaker.on('halfOpen',() => console.info(`🔄 Circuit HALF-OPEN: ${name} — testing`));
  breaker.on('close',   () => console.info(`✅ Circuit CLOSED: ${name} — recovered`));
  breaker.on('timeout', () => console.warn(`⏱ Timeout: ${name}`));
  breaker.on('reject',  () => console.warn(`🚫 Rejected (circuit open): ${name}`));

  // Metrics (expose to Prometheus/CloudWatch)
  breaker.on('success', (result, latency) => metrics.recordSuccess(name, latency));
  breaker.on('failure', (result, latency, error) => metrics.recordFailure(name, error));

  return breaker;
}

// Usage:
// const breaker = createBreaker(inventoryService.checkStock, 'inventory-check');
// const result = await breaker.fire(productId);
```

```typescript
// lib/resilientClient.ts — wraps any HTTP client with full resilience stack
import axios, { AxiosInstance } from 'axios';
import CircuitBreaker from 'opossum';
import { createBreaker } from './circuitBreaker';
import { withRetry } from './retry';
import { withTimeout } from './timeout';

export interface ResilientClientOptions {
  baseURL: string;
  serviceName: string;
  timeout?: number;
  retries?: number;
  fallback?: (error: Error) => any;
}

export class ResilientClient {
  private readonly client: AxiosInstance;
  private readonly breakers = new Map<string, CircuitBreaker<any>>();

  constructor(private readonly options: ResilientClientOptions) {
    this.client = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout ?? 3000,
    });
  }

  async get<T>(path: string, config?: any): Promise<T> {
    return this.call(() => this.client.get<T>(path, config).then(r => r.data), `GET:${path}`);
  }

  async post<T>(path: string, data?: any): Promise<T> {
    return this.call(() => this.client.post<T>(path, data).then(r => r.data), `POST:${path}`);
  }

  private async call<T>(fn: () => Promise<T>, key: string): Promise<T> {
    let breaker = this.breakers.get(key);
    if (!breaker) {
      breaker = createBreaker(fn, `${this.options.serviceName}:${key}`);
      if (this.options.fallback) breaker.fallback(this.options.fallback);
      this.breakers.set(key, breaker);
    }

    // Retry wraps the circuit breaker call
    return withRetry(() => breaker!.fire(), {
      retries: this.options.retries ?? 3,
      shouldRetry: (error) => isTransient(error),  // only retry transient errors
    });
  }
}

function isTransient(error: any): boolean {
  const status = error?.response?.status;
  if (status >= 400 && status < 500) return false; // 4xx = don't retry
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ETIMEDOUT') return true;
  if (status >= 500) return true;
  return false;
}
```

---

## Retry with Exponential Backoff + Jitter

```typescript
// lib/retry.ts
interface RetryOptions {
  retries?: number;           // max attempts (default: 3)
  delay?: number;             // initial delay ms (default: 100)
  maxDelay?: number;          // cap on delay (default: 5000)
  jitter?: boolean;           // randomize to prevent thundering herd (default: true)
  shouldRetry?: (err: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 100,
    maxDelay = 5000,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt > retries) break;             // exhausted retries
      if (!shouldRetry(error)) throw error;     // non-retryable error

      // Exponential backoff: delay * 2^(attempt-1)
      let waitMs = Math.min(delay * Math.pow(2, attempt - 1), maxDelay);

      // Full jitter: randomize to prevent thundering herd
      if (jitter) waitMs = Math.random() * waitMs;

      onRetry?.(attempt, error);
      console.warn(`Retry ${attempt}/${retries} after ${Math.round(waitMs)}ms: ${error.message}`);
      await sleep(waitMs);
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage:
// await withRetry(
//   () => inventoryApi.reserveStock(items),
//   { retries: 3, shouldRetry: isTransient, onRetry: (n, e) => logger.warn({attempt: n, error: e}) }
// );
```

---

## Timeout Wrapper

```typescript
// lib/timeout.ts
export function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Per-operation timeout budgets (document these):
const TIMEOUTS = {
  'inventory.checkStock':     500,   // fast read
  'payments.processPayment': 5000,   // can be slow
  'email.send':              2000,
  'search.query':             200,   // must be fast
  'auth.validate':            100,   // critical path
} as const;
```

---

## Bulkhead (resource isolation)

Prevents one slow dependency from consuming all resources:

```typescript
// lib/bulkhead.ts — thread pool / semaphore pattern
class Bulkhead {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(
    private readonly maxConcurrent: number,   // max simultaneous calls
    private readonly maxQueue: number = 10,    // max waiting in queue
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueue) {
        throw new BulkheadError('Bulkhead queue full — request rejected');
      }
      // Wait for a slot
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      next?.();
    }
  }
}

// Separate bulkheads per dependency — isolation is the point
const inventoryBulkhead = new Bulkhead(10, 20);  // max 10 concurrent inventory calls
const paymentsBulkhead  = new Bulkhead(5, 10);   // max 5 concurrent payment calls
const emailBulkhead     = new Bulkhead(20, 50);  // email can handle more concurrency

// Usage:
await inventoryBulkhead.execute(() => inventoryService.checkStock(items));
```

---

## Fallback Strategies

```typescript
// Strategy 1: Cached fallback (stale data is better than no data)
async function getProductPrice(productId: string): Promise<Price> {
  try {
    return await pricingService.getPrice(productId);
  } catch (error) {
    // Fall back to cached price (may be stale)
    const cached = await cache.get(`price:${productId}`);
    if (cached) {
      logger.warn({ productId, error }, 'Using stale cached price');
      return { ...cached, isStale: true };
    }
    throw error;  // No cache → propagate
  }
}

// Strategy 2: Default value (degrade gracefully)
async function getPersonalisedRecommendations(userId: string): Promise<Product[]> {
  try {
    return await recommendationService.getFor(userId);
  } catch (error) {
    // Non-critical: show bestsellers instead
    logger.warn({ userId }, 'Recommendation service unavailable, showing bestsellers');
    return bestsellerCache.get() ?? [];  // graceful degradation
  }
}

// Strategy 3: Queue for later (fire-and-forget with retry)
async function sendNotification(notification: Notification): Promise<void> {
  try {
    await emailService.send(notification);
  } catch (error) {
    // Email unavailable — queue for retry instead of failing the request
    await retryQueue.add('send-notification', notification, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
    });
    // Don't throw — notification failure should not fail the user's action
  }
}

// Strategy 4: Feature flag off (kill switch)
async function applyDynamicPricing(productId: string, basePrice: Money): Promise<Money> {
  if (!featureFlags.isEnabled('dynamic-pricing')) {
    return basePrice;  // feature flag = instant fallback
  }
  return pricingEngine.calculate(productId, basePrice);
}
```

---

## Health Checks (dependency health)

```typescript
// routes/health.routes.ts
router.get('/health', async (req, res) => {
  res.json({ status: 'ok', service: process.env.SERVICE_NAME });
});

router.get('/health/ready', async (req, res) => {
  // Check all dependencies — used by k8s readinessProbe
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkRabbitMQ(),  // if applicable
  ]);

  const results = {
    database: checks[0].status === 'fulfilled' ? 'ok' : 'degraded',
    redis:    checks[1].status === 'fulfilled' ? 'ok' : 'degraded',
    queue:    checks[2].status === 'fulfilled' ? 'ok' : 'degraded',
  };

  const isReady = Object.values(results).every(v => v === 'ok');
  res.status(isReady ? 200 : 503).json({ status: isReady ? 'ready' : 'not-ready', checks: results });
});

async function checkDatabase(): Promise<void> {
  await db.query('SELECT 1', { timeout: 1000 });
}

async function checkRedis(): Promise<void> {
  await redis.ping();
}
```

---

## Resilience Checklist per Service

```
For every dependency this service calls:
  [ ] Timeout set (never a call without a deadline)
  [ ] Retry configured (3 attempts, exponential backoff, no retry on 4xx)
  [ ] Circuit breaker wraps long-running or unreliable dependencies
  [ ] Fallback defined (what happens when this dependency is unavailable?)
  [ ] Bulkhead if this dependency is slow and high-traffic
  [ ] Health check includes this dependency in /health/ready
  [ ] Metrics: success/failure/latency tracked per dependency
  [ ] Alerts: circuit open = page on-call

For the service itself:
  [ ] /health endpoint (liveness)
  [ ] /health/ready endpoint (readiness — dependencies up?)
  [ ] Graceful shutdown: drain in-flight requests before exit
  [ ] Connection pool limits set (DB, Redis, HTTP client)
```

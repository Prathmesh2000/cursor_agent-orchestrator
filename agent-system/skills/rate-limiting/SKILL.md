---
name: "rate-limiting"
description: "Use when implementing rate limiting, throttling, or abuse prevention. Triggers: \"rate limit\", \"throttle\", \"abuse prevention\", \"too many requests\", \"429\", \"per-user limit\", \"API rate limit\", \"Redis rate limit\", or protecting any endpoint from abuse."
---


# Rate Limiting Skill

Implement production rate limiting: per-IP, per-user, per-endpoint, Redis sliding window, and graduated responses.

---

## express-rate-limit (simple)

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';

// General API limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args as any) }),
  message: { error: 'Too many requests', retryAfter: 'See Retry-After header' },
});

// Strict limit for auth
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // 5 attempts per 15 min
  keyGenerator: (req) => req.ip + ':' + req.body.email, // per IP+email
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args as any) }),
  handler: (req, res) => res.status(429).json({
    error: 'Too many login attempts. Try again in 15 minutes.',
  }),
});
```

---

## Redis Sliding Window (precise per-user)

```typescript
// lib/rateLimiter.ts
import { redis } from './redis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);     // remove old entries
  pipeline.zadd(key, now, `${now}-${Math.random()}`); // add current request
  pipeline.zcard(key);                                 // count in window
  pipeline.expire(key, windowSeconds + 1);

  const results = await pipeline.exec();
  const count = results![2][1] as number;

  if (count > limit) {
    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const resetAt = oldest.length > 1 ? Number(oldest[1]) + windowSeconds * 1000 : now;
    return { allowed: false, remaining: 0, resetAt, retryAfter: Math.ceil((resetAt - now) / 1000) };
  }

  return { allowed: true, remaining: limit - count, resetAt: now + windowSeconds * 1000 };
}

// Middleware
export function rateLimitMiddleware(key: (req: any) => string, limit: number, windowSeconds: number) {
  return async (req: any, res: any, next: any) => {
    const result = await checkRateLimit(key(req), limit, windowSeconds);
    res.set({
      'X-RateLimit-Limit':     limit,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset':     Math.ceil(result.resetAt / 1000),
    });
    if (!result.allowed) {
      res.set('Retry-After', result.retryAfter);
      return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: result.retryAfter });
    }
    next();
  };
}

// Usage:
router.post('/api/send-email',
  authenticate,
  rateLimitMiddleware(req => `email:${req.user.id}`, 10, 3600), // 10/hour per user
  handler
);
```

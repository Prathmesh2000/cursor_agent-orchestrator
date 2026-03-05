---
name: "caching-strategy"
description: "Use when implementing caching at any layer. Triggers: \"cache\", \"Redis\", \"caching\", \"CDN cache\", \"HTTP cache\", \"stale-while-revalidate\", \"cache-control\", \"cache invalidation\", \"performance\", or when API responses or pages are too slow."
---


# Caching Strategy Skill

Design and implement multi-layer caching: Redis application cache, HTTP cache headers, CDN strategy, and cache invalidation patterns.

---

## Caching Layers

```
Browser cache     → Cache-Control headers (minutes to days)
CDN cache         → CloudFront/Cloudflare (seconds to days, edge)
Application cache → Redis (milliseconds, full control)
DB query cache    → PostgreSQL, connection pool (microseconds)
```

---

## Redis Application Cache (Node.js)

```typescript
// lib/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', (err) => console.error('Redis error:', err));
```

```typescript
// lib/cache.ts
import { redis } from './redis';

type CacheOptions = { ttl?: number; prefix?: string };

export async function cacheGet<T>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheDel(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(...keys);
}

// Cache-aside pattern (read-through)
export async function cacheAside<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl = 300
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached) return cached;

  const fresh = await fetchFn();
  await cacheSet(key, fresh, ttl);
  return fresh;
}
```

```typescript
// usage in service
async function getUser(id: string) {
  return cacheAside(
    `user:${id}`,
    () => User.findByPk(id),
    600  // 10 minute TTL
  );
}

// Invalidate on update
async function updateUser(id: string, data: any) {
  const user = await User.update(data, { where: { id } });
  await cacheDel(`user:${id}`);          // exact key
  await cacheDel(`users:list:*`);        // pattern — all list caches
  return user;
}
```

---

## Cache Key Strategy

```
user:{id}                    → single resource
users:list:{hash(filters)}   → filtered list
posts:user:{userId}:page:{n} → paginated user posts

TTL strategy:
  Frequently changing: 60s  (activity feeds, live counters)
  Moderately stable:   5min (user profiles, post lists)
  Stable:              1h   (product catalogs, config)
  Nearly static:       24h  (reference data, reports)
```

---

## HTTP Cache Headers

```typescript
// middleware/cacheHeaders.ts
export function publicCache(maxAge: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set({
      'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      'Vary': 'Accept-Encoding',
    });
    next();
  };
}

export function privateCache(maxAge = 60) {
  return (_: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `private, max-age=${maxAge}, must-revalidate`);
    next();
  };
}

export function noCache() {
  return (_: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    next();
  };
}

// Usage:
router.get('/api/products', publicCache(3600), handler);   // CDN-cacheable
router.get('/api/me',       privateCache(60), handler);    // browser-only
router.post('/api/login',   noCache(), handler);           // never cache
```

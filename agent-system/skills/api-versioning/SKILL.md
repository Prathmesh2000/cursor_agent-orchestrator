---
name: "api-versioning"
description: "Use when designing API versioning strategies, handling breaking changes, deprecating endpoints, managing multiple API versions, or communicating API changes to consumers. Triggers: \"API versioning\", \"breaking change\", \"deprecate endpoint\", \"v2 API\", \"backwards compatible\", \"sunset API\", \"API migration\", \"version strategy\", or when an API change would break existing consumers."
---


# API Versioning Skill

Design and implement API versioning so services can evolve without breaking consumers. Choose the right strategy, communicate changes clearly, and deprecate safely.

---

## Versioning Strategies

```
URL versioning:       /api/v1/users    → Most explicit, most common
Header versioning:    API-Version: 2   → Clean URLs, harder to test/share
Query param:          /users?version=2 → Easy to test, messy URLs
Content negotiation:  Accept: application/vnd.myapp.v2+json → RESTful purist

Recommendation: URL versioning for public APIs, header for internal.
```

---

## URL Versioning (Recommended)

```javascript
// routes/index.js — mount versions as separate routers
const express = require('express');
const v1Router = require('./v1');
const v2Router = require('./v2');

const router = express.Router();

router.use('/v1', v1Router);
router.use('/v2', v2Router);

// Latest alias → always points to newest stable version
router.use('/latest', v2Router);

module.exports = router;
```

```javascript
// routes/v2/users.js — only define what CHANGED from v1
const express = require('express');
const router = express.Router();

// V2: returns { data: { user } } instead of { user }
// V2: includes computed fields
router.get('/:id', async (req, res) => {
  const user = await UserService.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' }});

  // V2 response shape: nested + enriched
  res.json({
    success: true,
    data: {
      user: {
        ...user.toJSON(),
        fullName: `${user.firstName} ${user.lastName}`,  // computed — new in v2
        _links: {  // HATEOAS — new in v2
          self: `/api/v2/users/${user.id}`,
          projects: `/api/v2/users/${user.id}/projects`,
        }
      }
    }
  });
});
```

---

## What Is a Breaking Change

```
BREAKING (requires new version):
  ✗ Remove a field from response
  ✗ Rename a field
  ✗ Change a field's type (string → number)
  ✗ Make an optional field required
  ✗ Remove or rename an endpoint
  ✗ Change HTTP method (GET → POST)
  ✗ Remove an enum value
  ✗ Change authentication method
  ✗ Change pagination shape

NON-BREAKING (safe to ship without new version):
  ✓ Add optional request field with default
  ✓ Add new field to response
  ✓ Add new endpoint
  ✓ Add new enum value (consumers must handle unknown)
  ✓ Expand validation (accepting more formats)
  ✓ Increase rate limits
  ✓ Improve error messages (same error code)
```

---

## Deprecation Process

```javascript
// Step 1: Mark endpoint as deprecated in response headers
router.get('/v1/users/:id', deprecationMiddleware('v1', '2025-06-01'), handler);

// middleware/deprecation.js
function deprecationMiddleware(version, sunsetDate) {
  return (req, res, next) => {
    const sunset = new Date(sunsetDate);
    res.set({
      'Deprecation': new Date().toUTCString(),
      'Sunset': sunset.toUTCString(),        // RFC 8594 — when it goes away
      'Link': '</api/v2/users>; rel="successor-version"',
      'Warning': `299 - "API ${version} is deprecated. Please migrate to v2 by ${sunsetDate}"`
    });
    next();
  };
}
```

```javascript
// Step 2: Log deprecation usage so you know who still uses v1
function deprecationMiddleware(version, sunsetDate) {
  return (req, res, next) => {
    logger.warn('Deprecated API version used', {
      version,
      sunsetDate,
      path: req.path,
      method: req.method,
      clientId: req.user?.clientId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    // Set headers...
    next();
  };
}
```

---

## Sunset Timeline

```
Month 0:  Ship v2
Month 1:  Notify consumers: "v1 deprecating in 6 months"
Month 3:  Reminder + migration guide published
Month 5:  Final warning — deprecation headers added to v1
Month 6:  v1 returns 410 Gone with migration instructions
Month 9:  v1 code removed

Communication channels:
  - Email to registered API consumers
  - Developer changelog / blog post
  - Deprecation headers on every v1 response
  - Status page announcement
```

---

## Migration Guide Template

```markdown
# Migration Guide: v1 → v2

**Breaking Changes in v2:**

### 1. Response Shape Change — Users

v1 response:
```json
{
  "user": { "id": "123", "name": "Alice" }
}
```

v2 response:
```json
{
  "success": true,
  "data": {
    "user": { "id": "123", "name": "Alice", "fullName": "Alice Smith" }
  }
}
```

**Migration:**
```javascript
// Before (v1)
const user = response.user;

// After (v2)
const user = response.data.user;
```

### 2. Pagination Shape Change

v1: `{ users: [...], total: 100, page: 1 }`  
v2: `{ data: { items: [...] }, pagination: { total: 100, page: 1, totalPages: 5 } }`

**v1 Sunset Date: [date]**
Questions? api-support@company.com
```

---

## API Changelog Format

```markdown
# API Changelog

## v2.1.0 — 2024-03-15
### Added
- `GET /api/v2/users/:id/activity` — user activity feed endpoint
- `archived` field on Project response (non-breaking)

### Changed  
- Rate limit increased: 1000 → 2000 requests/hour

---

## v2.0.0 — 2024-01-15 (Breaking)
### Breaking Changes
- Response envelope: all responses now wrapped in `{ success, data }`
- User endpoint: `name` split into `firstName` + `lastName`

### Migration
See: [migration guide](./MIGRATION-v1-v2.md)

---

## v1.3.0 — 2023-11-01 ⚠️ Deprecated (sunset 2024-07-01)
```

---

## Output Files

```
output/docs/
  API-VERSIONING-STRATEGY.md    ← Chosen strategy + rationale
  MIGRATION-v[N]-v[N+1].md     ← Migration guide for consumers
  API-CHANGELOG.md              ← Version history
output/code/
  middleware/deprecation.js     ← Deprecation headers + logging
  routes/v[N]/                  ← Versioned route handlers
```

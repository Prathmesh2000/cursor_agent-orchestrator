---
name: integration-test-writer
description: Use when writing integration tests that test multiple units working together — API endpoints with real DB, service chains, third-party integrations, or module boundaries. Triggers: "integration test", "API test", "test the endpoint", "supertest", "test with database", or when unit tests exist but the wiring between layers needs verification. Runs after unit tests pass in Workflow: Phase 5.
---

# Integration Test Writer Skill

Write integration tests that verify real component interactions: HTTP endpoints hitting a real (test) database, service chains, message queues, and third-party service contracts.

---

## What Integration Tests Cover

```
Unit tests verify:   function(input) → output in isolation
Integration tests verify:
  ✅ HTTP POST /api/users → DB row created → 201 response
  ✅ Auth middleware → controller → service → repository chain
  ✅ Caching layer reads from cache, not DB on second call
  ✅ Event emitted → subscriber runs → side effect in DB
  ✅ Third-party API contract hasn't changed (contract tests)
```

---

## Setup Principles

```
Test database:     Separate DB, never production
Seed data:         Fresh per test suite, not per test
Teardown:          Always clean up — use transactions + rollback
External services: Mock at HTTP level (nock/msw), not at SDK
Speed target:      < 5s per integration test (vs < 100ms unit)
Isolation:         Each describe() block gets clean state
```

---

## Express API Integration Tests (Jest + Supertest)

```javascript
// tests/integration/api/auth.api.test.js
const request = require('supertest');
const app = require('../../../src/app');
const db = require('../../../src/database');
const { User } = require('../../../src/models');
const { createTestUser, generateAuthToken } = require('../../helpers/auth.helper');

// Runs once before all tests in this file
beforeAll(async () => {
  await db.authenticate();
  await db.sync({ force: true }); // Clean schema
});

// Runs after all tests
afterAll(async () => {
  await db.close();
});

// Clean between test groups
beforeEach(async () => {
  await User.destroy({ where: {}, truncate: true, cascade: true });
});

describe('POST /api/auth/register', () => {
  const validPayload = {
    email: 'new@example.com',
    password: 'SecurePass123!',
    name: 'Test User',
  };

  it('creates user and returns 201 with tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload)
      .expect(201);

    expect(res.body).toMatchObject({
      success: true,
      data: {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: expect.any(String),
          email: 'new@example.com',
          name: 'Test User',
        },
      },
    });

    // Verify user actually in DB
    const dbUser = await User.findOne({ where: { email: 'new@example.com' } });
    expect(dbUser).not.toBeNull();
    expect(dbUser.passwordHash).not.toBe('SecurePass123!'); // Must be hashed
  });

  it('returns 409 when email already registered', async () => {
    await createTestUser({ email: 'existing@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, email: 'existing@example.com' })
      .expect(409);

    expect(res.body.error).toMatch(/already in use/i);
  });

  it('returns 400 with validation errors for invalid payload', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'notanemail', password: 'short' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  it('returns 429 after 5 failed registration attempts from same IP', async () => {
    // Exhaust rate limit
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/register').send({ email: 'bad' });
    }

    const res = await request(app)
      .post('/api/auth/register')
      .send(validPayload)
      .expect(429);

    expect(res.body.error).toMatch(/too many/i);
  });
});

describe('POST /api/auth/login', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'login@example.com',
      password: 'SecurePass123!',
    });
  });

  it('returns tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'SecurePass123!' })
      .expect(200);

    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it('updates lastLoginAt in database', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'SecurePass123!' });

    const updated = await User.findByPk(testUser.id);
    expect(updated.lastLoginAt).not.toBeNull();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpassword' })
      .expect(401);

    expect(res.body.error).toBe('Invalid email or password');
  });
});

describe('Protected routes — Auth middleware', () => {
  let authToken;

  beforeEach(async () => {
    const user = await createTestUser();
    authToken = generateAuthToken(user.id);
  });

  it('allows access with valid token', async () => {
    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
  });

  it('returns 401 with no token', async () => {
    await request(app).get('/api/users/me').expect(401);
  });

  it('returns 401 with expired token', async () => {
    const expiredToken = generateAuthToken('uuid', { expiresIn: '-1s' });

    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('returns 401 with malformed token', async () => {
    await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer not.a.real.token')
      .expect(401);
  });
});
```

---

## Database Integration Tests

```javascript
// tests/integration/repositories/user.repository.test.js
const { User, Post } = require('../../../src/models');
const UserRepository = require('../../../src/repositories/user.repository');
const db = require('../../../src/database');

beforeAll(() => db.sync({ force: true }));
afterAll(() => db.close());
beforeEach(() => User.destroy({ where: {}, truncate: true, cascade: true }));

describe('UserRepository', () => {
  describe('findByEmail()', () => {
    it('returns user with associations when found', async () => {
      const created = await User.create({
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hash',
      });

      const user = await UserRepository.findByEmail('test@example.com');

      expect(user.id).toBe(created.id);
      expect(user.posts).toBeDefined(); // eager loaded
    });

    it('returns null when not found', async () => {
      const user = await UserRepository.findByEmail('ghost@example.com');
      expect(user).toBeNull();
    });

    it('is case-insensitive', async () => {
      await User.create({ email: 'lower@example.com', passwordHash: 'h', name: 'N' });

      const user = await UserRepository.findByEmail('LOWER@EXAMPLE.COM');
      expect(user).not.toBeNull();
    });
  });

  describe('softDelete()', () => {
    it('sets deletedAt but keeps row in DB (paranoid)', async () => {
      const user = await User.create({ email: 'del@test.com', passwordHash: 'h', name: 'N' });

      await UserRepository.softDelete(user.id);

      // Not returned in normal query
      const found = await User.findByPk(user.id);
      expect(found).toBeNull();

      // But exists with paranoid: false
      const paranoid = await User.findByPk(user.id, { paranoid: false });
      expect(paranoid.deletedAt).not.toBeNull();
    });
  });
});
```

---

## Mock External HTTP (nock)

```javascript
// tests/integration/services/payment.service.test.js
const nock = require('nock');
const PaymentService = require('../../../src/services/payment.service');

afterEach(() => nock.cleanAll());

describe('PaymentService.chargeCard()', () => {
  it('returns charge ID on successful Stripe call', async () => {
    nock('https://api.stripe.com')
      .post('/v1/charges')
      .reply(200, {
        id: 'ch_test_123',
        status: 'succeeded',
        amount: 5000,
      });

    const result = await PaymentService.chargeCard({
      amount: 5000,
      currency: 'usd',
      source: 'tok_visa',
    });

    expect(result.chargeId).toBe('ch_test_123');
    expect(result.status).toBe('succeeded');
  });

  it('throws PaymentError on Stripe card decline', async () => {
    nock('https://api.stripe.com')
      .post('/v1/charges')
      .reply(402, {
        error: { type: 'card_error', code: 'card_declined', message: 'Your card was declined.' },
      });

    await expect(PaymentService.chargeCard({ amount: 5000 }))
      .rejects.toThrow('Card declined');
  });

  it('throws NetworkError on Stripe timeout', async () => {
    nock('https://api.stripe.com')
      .post('/v1/charges')
      .replyWithError({ code: 'ETIMEDOUT' });

    await expect(PaymentService.chargeCard({ amount: 5000 }))
      .rejects.toThrow('Payment service unavailable');
  });
});
```

---

## Test Helper Utilities (Create Once, Reuse)

```javascript
// tests/helpers/auth.helper.js
const { User } = require('../../src/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let userCounter = 0;

/**
 * Creates a real user in the test DB with hashed password.
 */
async function createTestUser(overrides = {}) {
  userCounter++;
  const password = overrides.password || 'TestPass123!';
  const passwordHash = await bcrypt.hash(password, 10);

  return User.create({
    email: overrides.email || `testuser${userCounter}@example.com`,
    name: overrides.name || `Test User ${userCounter}`,
    passwordHash,
    isActive: overrides.isActive ?? true,
  });
}

/**
 * Generates a valid JWT for a user ID (no DB required).
 */
function generateAuthToken(userId, options = {}) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '15m', ...options }
  );
}

module.exports = { createTestUser, generateAuthToken };
```

---

## Integration Test Report Template

```markdown
## Integration Test Report: [Feature/Module]

### API Coverage
| Endpoint | Method | Scenarios | Pass |
|----------|--------|-----------|------|
| /api/auth/register | POST | 4 | ✅ 4/4 |
| /api/auth/login | POST | 3 | ✅ 3/3 |
| /api/users/me | GET | 4 | ✅ 4/4 |

### DB Interactions Verified
- User creation → password hashed in DB ✅
- Soft delete → row preserved with deletedAt ✅
- Associations loaded correctly ✅

### External Services Mocked
- Stripe API (nock) — 3 scenarios ✅

### Run Command
\`\`\`bash
jest tests/integration/ --runInBand --forceExit
\`\`\`
All [N] tests pass ✅ | Time: [X]s
```

Save to: `output/tests/integration/`

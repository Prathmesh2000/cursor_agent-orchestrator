---
name: "api-contract-tester"
description: "Use when implementing consumer-driven contract tests, validating API contracts between services, setting up Pact testing, or ensuring that API providers don't break their consumers. Triggers: \"contract test\", \"Pact\", \"consumer-driven\", \"API contract\", \"provider test\", \"consumer test\", \"breaking change detection\", or when microservices need to evolve independently without breaking each other."
---


# API Contract Tester Skill

Implement consumer-driven contract testing with Pact. Consumers define what they need; providers prove they deliver it — without end-to-end tests.

---

## Why Contract Testing

```
The Problem with E2E tests for microservices:
  ❌ Slow (need all services running)
  ❌ Flaky (any service down = test fails)
  ❌ No ownership (who fixes it when it fails?)
  ❌ Don't tell you WHICH service broke the contract

Contract Testing solves this:
  ✅ Consumer defines exactly what it needs
  ✅ Provider verifies it can deliver that
  ✅ Each team runs their own tests independently
  ✅ Broker tracks which consumers each provider must satisfy
  ✅ Prevents breaking changes from reaching production
```

---

## Pact Consumer Test (what the consumer needs)

```javascript
// tests/contracts/consumer/userService.pact.test.js
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, eachLike, string, integer, datetime } = MatchersV3;
const path = require('path');

const provider = new PactV3({
  consumer: 'frontend-app',      // This service's name
  provider: 'user-service',      // The service it calls
  dir: path.resolve(process.cwd(), 'pacts'),  // Output contract files here
  logLevel: 'warn',
});

describe('User Service Contract', () => {

  describe('GET /api/users/:id', () => {
    it('returns a user when they exist', async () => {
      await provider
        .given('user with ID abc123 exists')   // Provider state
        .uponReceiving('a request for user abc123')
        .withRequest({
          method: 'GET',
          path: '/api/users/abc123',
          headers: { Authorization: like('Bearer token123') },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            success: true,
            data: {
              id: string('abc123'),
              email: string('user@example.com'),
              name: string('Alice Smith'),
              role: string('user'),
              createdAt: datetime("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", '2024-01-15T10:30:00.000Z'),
            },
          },
        })
        .executeTest(async (mockProvider) => {
          // Test that our consumer code works with this contract
          const userClient = new UserClient(mockProvider.url);
          const user = await userClient.getUser('abc123', 'Bearer token123');

          expect(user.id).toBe('abc123');
          expect(user.email).toBe('user@example.com');
        });
    });

    it('returns 404 when user does not exist', async () => {
      await provider
        .given('user with ID unknown999 does not exist')
        .uponReceiving('a request for non-existent user')
        .withRequest({
          method: 'GET',
          path: '/api/users/unknown999',
          headers: { Authorization: like('Bearer token123') },
        })
        .willRespondWith({
          status: 404,
          body: {
            success: false,
            error: {
              code: string('NOT_FOUND'),
              message: string('User not found'),
            },
          },
        })
        .executeTest(async (mockProvider) => {
          const userClient = new UserClient(mockProvider.url);
          await expect(userClient.getUser('unknown999', 'Bearer token123'))
            .rejects.toThrow('User not found');
        });
    });
  });

  describe('POST /api/users', () => {
    it('creates a user successfully', async () => {
      await provider
        .given('no user with email newuser@example.com exists')
        .uponReceiving('a request to create a user')
        .withRequest({
          method: 'POST',
          path: '/api/users',
          headers: {
            Authorization: like('Bearer admin-token'),
            'Content-Type': 'application/json',
          },
          body: {
            email: 'newuser@example.com',
            name: 'New User',
            password: like('SecurePass123!'),
          },
        })
        .willRespondWith({
          status: 201,
          body: {
            success: true,
            data: {
              id: string('new-uuid'),
              email: string('newuser@example.com'),
              name: string('New User'),
            },
          },
        })
        .executeTest(async (mockProvider) => {
          const userClient = new UserClient(mockProvider.url);
          const user = await userClient.createUser(
            { email: 'newuser@example.com', name: 'New User', password: 'SecurePass123!' },
            'Bearer admin-token'
          );
          expect(user.email).toBe('newuser@example.com');
        });
    });
  });
});
```

---

## Pact Provider Verification (proving you deliver)

```javascript
// tests/contracts/provider/userService.pact.verify.test.js
const { Verifier } = require('@pact-foundation/pact');
const path = require('path');
const app = require('../../src/app');

describe('User Service Provider Verification', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(3001);
  });

  afterAll(() => server.close());

  it('satisfies all consumer contracts', async () => {
    const options = {
      provider: 'user-service',
      providerBaseUrl: 'http://localhost:3001',

      // Pull contracts from Pact Broker (preferred)
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_SHA || 'local',

      // OR load from local files (development)
      // pactUrls: [path.resolve(__dirname, '../../../pacts/frontend-app-user-service.json')],

      // Provider states — set up test data for each state
      stateHandlers: {
        'user with ID abc123 exists': async () => {
          await db.seed.run({ specific: 'test-user-abc123' });
        },
        'user with ID unknown999 does not exist': async () => {
          await db('users').where({ id: 'unknown999' }).delete();
        },
        'no user with email newuser@example.com exists': async () => {
          await db('users').where({ email: 'newuser@example.com' }).delete();
        },
      },

      // Request filter: add auth for provider tests
      requestFilter: (req, res, next) => {
        // Override auth headers for contract tests
        req.headers.authorization = 'Bearer test-token-valid';
        next();
      },
    };

    const verifier = new Verifier(options);
    return verifier.verifyProvider();
  });
});
```

---

## Pact Broker Setup (Docker Compose)

```yaml
# docker-compose.pact.yml
services:
  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_URL: postgresql://pact:pact@pact-db/pact
      PACT_BROKER_BASIC_AUTH_USERNAME: admin
      PACT_BROKER_BASIC_AUTH_PASSWORD: admin
      PACT_BROKER_PUBLIC_HEARTBEAT: "true"

  pact-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pact
      POSTGRES_USER: pact
      POSTGRES_PASSWORD: pact
    volumes:
      - pact-db-data:/var/lib/postgresql/data

volumes:
  pact-db-data:
```

---

## Contract Testing in CI/CD

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  consumer-contracts:
    name: Generate Consumer Contracts
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - name: Run consumer Pact tests (generates contracts)
        run: npm run test:pact:consumer
        env:
          PACT_BROKER_URL: ${{ vars.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}

  provider-verification:
    name: Verify Provider Contracts
    runs-on: ubuntu-latest
    needs: [consumer-contracts]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - name: Start test server
        run: npm run start:test &
      - name: Verify all consumer contracts
        run: npm run test:pact:provider
        env:
          PACT_BROKER_URL: ${{ vars.PACT_BROKER_URL }}
          PACT_BROKER_TOKEN: ${{ secrets.PACT_BROKER_TOKEN }}
          GIT_SHA: ${{ github.sha }}
          CI: "true"

  can-i-deploy:
    name: Can I Deploy?
    runs-on: ubuntu-latest
    needs: [provider-verification]
    steps:
      - name: Check Pact compatibility matrix
        uses: pactflow/actions/can-i-deploy@v1
        with:
          application_name: user-service
          version: ${{ github.sha }}
          environment: production
          broker_url: ${{ vars.PACT_BROKER_URL }}
          token: ${{ secrets.PACT_BROKER_TOKEN }}
```

---

## Contract Test Coverage Checklist

For each API endpoint, verify these contract scenarios:

```
[ ] Happy path: valid request → expected 2xx response
[ ] Not found: valid ID that doesn't exist → 404 with code NOT_FOUND
[ ] Unauthorized: missing/invalid token → 401
[ ] Forbidden: valid token, no permission → 403
[ ] Validation: malformed request body → 422 with details
[ ] Conflict: duplicate creation → 409 (if applicable)

For lists:
[ ] Empty result: no matching records → 200 with empty array
[ ] Pagination: verify page/limit in response
```

---

## Output Files

```
pacts/
  [consumer]-[provider].json     ← Generated contract files
tests/contracts/
  consumer/[service].pact.test.js
  provider/[service].pact.verify.test.js
output/docs/
  CONTRACT-TESTING.md            ← How to run + add contracts
```

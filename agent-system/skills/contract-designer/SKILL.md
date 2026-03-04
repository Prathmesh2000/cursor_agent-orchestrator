---
name: contract-designer
description: Use when designing the contract between services — the API, events, and data that cross service boundaries. Triggers: "service contract", "inter-service API", "event schema", "service interface", "API contract for microservice", "what does service X expose", "event-driven contract", "AsyncAPI", or before implementing any inter-service communication. Contracts must be agreed before implementation.
---

# Contract Designer Skill

Design and document the contracts between services: REST API contracts (OpenAPI), event contracts (AsyncAPI), and data contracts. Agreed before any service is implemented.

---

## Why Contracts First

```
Without agreed contracts:
  - Service A implements what it thinks Service B needs
  - Service B implements what it thinks it exposes
  - Integration fails in week 3 when both meet for the first time
  - Both teams argue about who's wrong

With agreed contracts:
  - Both teams work independently from week 1
  - Contract is the single source of truth
  - Breaking changes are detected in CI (contract tests)
  - Teams can mock the other service from day 1
```

---

## REST API Contract (OpenAPI 3.1)

```yaml
# contracts/user-service-api.yaml
openapi: 3.1.0
info:
  title: User Service API
  version: 1.0.0
  description: |
    Internal API contract for the User Service.
    This contract is the authoritative spec for all consumers.

    Breaking changes require:
      1. New major version (v2)
      2. Deprecation notice 2 sprints before removal
      3. Migration guide in CHANGELOG

servers:
  - url: http://user-service:3001
    description: Internal service URL

security:
  - BearerAuth: []

paths:
  /users/{id}:
    get:
      operationId: getUserById
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema: { $ref: '#/components/schemas/UserResponse' }
        '404':
          description: User not found
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }
        '401':
          description: Invalid or missing JWT
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }

  /users:
    post:
      operationId: createUser
      summary: Create a new user
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateUserRequest' }
      responses:
        '201':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/UserResponse' }
        '409':
          description: Email already exists
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ErrorResponse' }

components:
  schemas:
    UserResponse:
      type: object
      required: [id, email, name, role, createdAt]
      properties:
        id:        { type: string, format: uuid }
        email:     { type: string, format: email }
        name:      { type: string }
        role:      { type: string, enum: [admin, editor, viewer] }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }
      # NEVER include: passwordHash, refreshTokenHash, internal fields

    CreateUserRequest:
      type: object
      required: [email, name, role]
      properties:
        email:    { type: string, format: email }
        name:     { type: string, minLength: 2, maxLength: 100 }
        role:     { type: string, enum: [admin, editor, viewer] }

    ErrorResponse:
      type: object
      required: [error, code]
      properties:
        error:   { type: string }
        code:    { type: string }
        details: { type: object }

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

## Event Contract (AsyncAPI)

```yaml
# contracts/events/user-events.yaml
asyncapi: 3.0.0
info:
  title: User Service Events
  version: 1.0.0
  description: Events published by the User Service

servers:
  production:
    host: kafka-broker:9092
    protocol: kafka

channels:
  user/created:
    description: Published when a new user is created
    messages:
      UserCreated: { $ref: '#/components/messages/UserCreated' }

  user/deactivated:
    description: Published when a user account is deactivated
    messages:
      UserDeactivated: { $ref: '#/components/messages/UserDeactivated' }

  user/role-changed:
    description: Published when a user's role is changed
    messages:
      UserRoleChanged: { $ref: '#/components/messages/UserRoleChanged' }

components:
  messages:
    UserCreated:
      name: UserCreated
      contentType: application/json
      headers:
        type: object
        properties:
          correlationId: { type: string, format: uuid }
          timestamp:     { type: string, format: date-time }
          serviceVersion:{ type: string }
      payload:
        type: object
        required: [eventId, type, timestamp, data]
        properties:
          eventId:   { type: string, format: uuid }
          type:      { type: string, const: user.created }
          timestamp: { type: string, format: date-time }
          data:
            type: object
            required: [userId, email, name, role]
            properties:
              userId: { type: string, format: uuid }
              email:  { type: string, format: email }
              name:   { type: string }
              role:   { type: string }

    UserDeactivated:
      name: UserDeactivated
      payload:
        type: object
        required: [eventId, type, timestamp, data]
        properties:
          eventId:   { type: string, format: uuid }
          type:      { type: string, const: user.deactivated }
          timestamp: { type: string, format: date-time }
          data:
            type: object
            required: [userId, reason]
            properties:
              userId: { type: string, format: uuid }
              reason: { type: string, enum: [self_requested, admin_action, fraud_detected] }
```

---

## TypeScript Contract Types (shared types package)

```typescript
// packages/contracts/src/user-service.ts
// This package is consumed by ALL services that integrate with User Service

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;  // ISO 8601
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

// Events
export interface BaseEvent<T extends string, D> {
  eventId: string;
  type: T;
  timestamp: string;  // ISO 8601
  data: D;
}

export type UserCreatedEvent = BaseEvent<'user.created', {
  userId: string;
  email: string;
  name: string;
  role: string;
}>;

export type UserDeactivatedEvent = BaseEvent<'user.deactivated', {
  userId: string;
  reason: 'self_requested' | 'admin_action' | 'fraud_detected';
}>;

export type UserEvent = UserCreatedEvent | UserDeactivatedEvent;

// Error shape (all services use this)
export interface ServiceError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}
```

---

## Contract Test (Pact — consumer-driven)

```typescript
// order-service/tests/contract/UserServiceContract.test.ts
// Consumer: Order Service
// Provider: User Service
// Tests that User Service ACTUALLY returns what Order Service expects

import { Pact, Matchers } from '@pact-foundation/pact';
const { like, uuid, iso8601DateTime } = Matchers;

const provider = new Pact({
  consumer: 'order-service',
  provider: 'user-service',
  port: 4000,
  log: 'pact.log',
  dir: 'pacts',
});

describe('Order Service → User Service contract', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  it('gets user by ID', async () => {
    await provider.addInteraction({
      state: 'a user with id abc-123 exists',
      uponReceiving: 'a request to get user abc-123',
      withRequest: {
        method: 'GET',
        path: '/users/abc-123',
        headers: { Authorization: like('Bearer token') },
      },
      willRespondWith: {
        status: 200,
        body: {
          id:        uuid('abc-123'),
          email:     like('user@example.com'),
          name:      like('Alice'),
          role:      like('editor'),
          createdAt: iso8601DateTime(),
          updatedAt: iso8601DateTime(),
        },
      },
    });

    // Call the actual client
    const user = await userServiceClient.getById('abc-123');
    expect(user.id).toBe('abc-123');
    expect(user.email).toBeTruthy();
  });

  it('returns 404 for missing user', async () => {
    await provider.addInteraction({
      state: 'user xyz-999 does not exist',
      uponReceiving: 'a request for non-existent user',
      withRequest: { method: 'GET', path: '/users/xyz-999', headers: { Authorization: like('Bearer token') } },
      willRespondWith: {
        status: 404,
        body: { error: like('User not found'), code: like('USER_NOT_FOUND') },
      },
    });

    await expect(userServiceClient.getById('xyz-999')).rejects.toThrow('User not found');
  });
});
```

---

## Contract Governance Rules

```
1. CONTRACTS ARE NEGOTIATED — both consumer and provider agree
   → Consumer: "I need these fields in this format"
   → Provider: "I can give you these fields"
   → Both sign off before implementation

2. BACKWARD COMPATIBILITY
   → New optional fields: OK (non-breaking)
   → New required fields: BREAKING — needs major version
   → Removed fields: BREAKING — needs deprecation period
   → Changed types: BREAKING — needs major version

3. VERSIONING
   → URL versioning for REST: /v1/users, /v2/users
   → Header versioning: X-API-Version: 2
   → Event versioning: event.type = 'user.created.v2'

4. BREAKING CHANGE PROCESS
   → Announce in #architecture channel (or equivalent)
   → Give consumers 2 sprints to migrate
   → Run v1 and v2 in parallel during migration
   → Remove v1 only after all consumers migrated (check pact broker)

5. EVERY CONTRACT CHANGE = ADR
   → Document why, what alternatives were considered, what breaks
```

---

## Output Files

```
contracts/
  [service]-api.yaml              ← OpenAPI REST contract
  events/
    [service]-events.yaml         ← AsyncAPI event contracts
packages/
  contracts/
    src/
      [service]-service.ts        ← Shared TypeScript types
tests/
  contract/
    [Consumer][Provider]Contract.test.ts
```

---
name: "adr-writer"
description: "Use when capturing, writing, or reviewing architecture decisions. Triggers: \"ADR\", \"architecture decision\", \"decision record\", \"why did we choose\", \"document this decision\", \"architecture choice\", \"record this decision\", \"technical decision\", or whenever a significant technical choice is made that future developers need to understand. ADRs prevent re-litigating past decisions."
---


# ADR Writer Skill

Capture architecture decisions in a structured, searchable record. ADRs answer "why does the code look like this?" for future developers — preventing the same debate from happening twice and preserving context that comments never capture.

---

## When to Write an ADR

```
Write an ADR when:
  ✅ Choosing between 2+ viable technical options
  ✅ Adopting a new library, framework, or service
  ✅ Establishing a new coding pattern or convention
  ✅ Making a database schema decision with long-term consequences
  ✅ Deciding on a communication protocol between services
  ✅ Rejecting a seemingly obvious solution (document WHY)
  ✅ Reversing a previous decision

Do NOT write an ADR for:
  ❌ Implementation details that can change without team discussion
  ❌ Bug fixes
  ❌ Routine configuration changes
  ❌ Decisions that are trivially reversible
```

---

## ADR Numbering and Location

```
docs/
  adr/
    README.md              ← index of all ADRs
    0001-use-postgresql.md
    0002-jwt-not-sessions.md
    0003-monorepo-with-turborepo.md
    0004-rejected-graphql.md    ← rejected decisions are equally valuable
```

```markdown
<!-- docs/adr/README.md -->
# Architecture Decision Records

| # | Title | Status | Date |
|---|---|---|---|
| 0001 | Use PostgreSQL as primary database | ✅ Accepted | 2024-01-15 |
| 0002 | JWT over session-based auth | ✅ Accepted | 2024-01-20 |
| 0003 | Monorepo with Turborepo | ✅ Accepted | 2024-02-01 |
| 0004 | Rejected: GraphQL for public API | ❌ Rejected | 2024-02-10 |
| 0005 | Superseded: REST only → REST + WebSocket | 🔄 Superseded by 0008 | 2024-03-01 |
```

---

## ADR Template

```markdown
# ADR-[NNNN]: [Short Imperative Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Rejected | Deprecated | Superseded by ADR-XXXX
**Deciders:** [Names or roles who made this decision]
**Ticket:** [Jira/GitHub issue link]

---

## Context

[Describe the situation that forces a decision. What is the problem we're solving?
What constraints exist? What happened that made this decision necessary NOW?
Write this so someone joining the team in 2 years understands the situation without
needing to ask anyone.]

Example:
"Our API currently returns all data in a flat JSON structure. As we add more resource
types (users, orders, products, reviews), we're seeing: (1) inconsistent error formats
across endpoints, (2) no standard way to paginate lists, (3) clients re-implementing
parsing logic. We need a response envelope standard before we have more than 20 endpoints."

---

## Decision

**We will [decision statement].**

[1-3 sentences stating the decision clearly and unambiguously.
Not "we might consider" or "we could potentially" — be definitive.]

Example:
"We will adopt a standard JSON response envelope for all API endpoints:
`{ success: boolean, data?: T, error?: string, meta?: PaginationMeta }`.
This envelope will be enforced by middleware and validated in tests."

---

## Options Considered

### Option A: [Name] ← [CHOSEN / REJECTED]

**Description:** [What it is]

**Pros:**
- [Advantage 1]
- [Advantage 2]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]

**Why chosen/rejected:** [The deciding factor]

---

### Option B: [Name] ← [CHOSEN / REJECTED]

**Description:** [What it is]

**Pros:**
- [Advantage 1]

**Cons:**
- [Disadvantage 1]

**Why chosen/rejected:** [The deciding factor]

---

### Option C: [Name] ← [CONSIDERED BUT NOT EVALUATED FULLY]

[Brief description and why it wasn't explored]

---

## Consequences

### Positive
- [Good outcome 1]
- [Good outcome 2]

### Negative / Trade-offs
- [What we're giving up or making harder]
- [Technical debt we're accepting]

### Neutral
- [Things that change but aren't clearly good or bad]

---

## Implementation Notes

[Practical guidance for developers implementing this decision.
What do they need to do differently? What patterns must they follow?]

Example:
"All new controllers must use the `successResponse()` and `errorResponse()` helpers
in `src/utils/response.ts`. The integration test suite will fail if any endpoint
returns a non-standard envelope. See `src/controllers/UserController.ts` for reference."

---

## References

- [Link to relevant RFC, blog post, benchmark, or prior art]
- [Link to PR that implements this decision]
- [Link to related ADRs]

---

## Revision History

| Date | Author | Change |
|---|---|---|
| YYYY-MM-DD | [Name] | Initial draft |
| YYYY-MM-DD | [Name] | Accepted after review |
```

---

## Real Examples

### ADR-0001: Use PostgreSQL as Primary Database

```markdown
# ADR-0001: Use PostgreSQL as Primary Database

**Date:** 2024-01-15
**Status:** ✅ Accepted
**Deciders:** CTO, Backend Architect, Database Architect

## Context

We are building a SaaS platform with: user accounts, subscription billing,
multi-tenant data, complex reporting queries, and ACID transaction requirements
(billing operations must be atomic). We need to choose a primary database before
any schema work begins.

## Decision

**We will use PostgreSQL 15 as the primary database for all services.**

## Options Considered

### Option A: PostgreSQL ← CHOSEN
Pros: ACID, mature, excellent JSON support, strong ORM support (Sequelize/Prisma),
      row-level security for multi-tenancy, powerful FTS, team expertise.
Cons: Harder to scale writes beyond single node vs NoSQL.
Why chosen: Our workload is read-heavy with complex queries. ACID is non-negotiable
            for billing. Team has deep Postgres expertise.

### Option B: MongoDB ← REJECTED
Pros: Flexible schema, easy horizontal scaling.
Cons: No ACID multi-document transactions (until 4.0, complex to use), no row-level
      security, schema flexibility is a liability not asset for our domain.
Why rejected: ACID guarantees for billing are required.

### Option C: MySQL ← REJECTED
Pros: Widely used, good performance.
Cons: Weaker JSON support, no row-level security, team unfamiliar.
Why rejected: PostgreSQL strictly better for our use case.

## Consequences

Positive:
- Team can use existing Postgres expertise immediately
- Row-level security enables clean multi-tenancy

Negative:
- Write scaling requires read replicas or sharding (acceptable at our stage)
- Vendor lock-in to PostgreSQL dialect

## Implementation Notes

Use Sequelize 6 with PostgreSQL dialect. All migrations via Sequelize CLI.
Never use raw SQL in services — use Sequelize ORM. For complex reporting queries,
raw SQL is acceptable in dedicated report services only.
```

---

### ADR-0004: Rejected — GraphQL for Public API

```markdown
# ADR-0004: Rejected — GraphQL for Public API

**Date:** 2024-02-10
**Status:** ❌ Rejected

## Context

Frontend team requested GraphQL to avoid over-fetching and allow flexible queries.
We evaluated this as part of the API design phase.

## Decision

**We will NOT adopt GraphQL. We will use REST with field selection via `?fields=`.**

## Why Rejected

- Our API has < 15 resources — GraphQL complexity not justified
- Team has no GraphQL expertise — learning curve during launch sprint
- N+1 query problem in resolvers requires DataLoader — additional complexity
- REST + OpenAPI gives us documentation and contract testing for free
- We can add GraphQL in v2 if REST proves insufficient (REST is not a dead end)

## What We'll Do Instead

REST with: (1) `?fields=id,name,email` for field selection, (2) `?include=orders`
for related resources, (3) consistent pagination envelope. This covers 90% of the
use cases that motivated the GraphQL request.
```

---

## ADR Review Checklist

- [ ] Context section written so future developer understands without asking
- [ ] Decision is stated definitively (not "we might")
- [ ] At least 2 options considered with explicit trade-offs
- [ ] Rejected options document WHY — not just what
- [ ] Consequences include the negative trade-offs (honest)
- [ ] Implementation notes tell developers what to do differently
- [ ] ADR index (README.md) updated
- [ ] Related ADRs linked
- [ ] Status set correctly (Proposed until reviewed by relevant stakeholders)

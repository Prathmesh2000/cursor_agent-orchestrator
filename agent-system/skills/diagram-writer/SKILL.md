---
name: diagram-writer
description: Use when creating architecture diagrams, sequence diagrams, ERDs, flowcharts, system design visuals, C4 diagrams, or any technical visualization. Triggers: "diagram", "architecture diagram", "sequence diagram", "flowchart", "system design diagram", "draw", "visualize", "C4", "mermaid", or when a technical concept needs visual explanation. Produces Mermaid code (renders in GitHub, Notion, Confluence).
---

# Diagram Writer Skill

Produce clear, accurate technical diagrams as Mermaid code. Diagrams render in GitHub, GitLab, Notion, Confluence, and most modern documentation tools.

---

## Diagram Type Selection

```
System architecture    → C4 Context or Container diagram
Service interactions   → Sequence diagram
Data flow              → Flowchart (LR direction)
Database structure     → ERD
State machine          → State diagram
CI/CD pipeline         → Flowchart (TD direction)
Team/component ownership → Mindmap or flowchart
API call sequence      → Sequence diagram
Decision tree          → Flowchart
Infrastructure         → C4 Deployment or flowchart
```

---

## System Architecture (C4 Context)

```mermaid
C4Context
  title System Context — My Application

  Person(user, "End User", "Authenticated customer")
  Person(admin, "Admin", "Internal team member")

  System(webapp, "My App", "Main web application — React + Node.js API")

  System_Ext(stripe, "Stripe", "Payment processing")
  System_Ext(sendgrid, "SendGrid", "Transactional email")
  System_Ext(auth0, "Auth0", "Identity provider")

  Rel(user, webapp, "Uses", "HTTPS")
  Rel(admin, webapp, "Manages", "HTTPS")
  Rel(webapp, stripe, "Charges cards", "REST API")
  Rel(webapp, sendgrid, "Sends emails", "REST API")
  Rel(webapp, auth0, "Authenticates", "OIDC")
```

---

## Service Architecture (C4 Container)

```mermaid
C4Container
  title Container Diagram — My Application

  Person(user, "User")

  Boundary(aws, "AWS us-east-1") {
    Container(cdn, "CloudFront CDN", "AWS CloudFront", "Static assets + cache")
    Container(alb, "Load Balancer", "AWS ALB", "Route + TLS termination")
    Container(api, "API Service", "Node.js + Express", "REST API, business logic")
    Container(worker, "Job Worker", "Node.js", "Async job processing")
    ContainerDb(db, "Database", "PostgreSQL 15", "Primary data store")
    ContainerDb(cache, "Cache", "Redis 7", "Sessions + query cache")
    Container(queue, "Job Queue", "AWS SQS", "Async job queue")
    ContainerDb(storage, "File Storage", "AWS S3", "User uploads")
  }

  System_Ext(stripe, "Stripe")
  System_Ext(email, "SendGrid")

  Rel(user, cdn, "Requests", "HTTPS")
  Rel(cdn, alb, "Forwards dynamic", "HTTPS")
  Rel(alb, api, "Routes to", "HTTP")
  Rel(api, db, "Reads/writes", "PostgreSQL")
  Rel(api, cache, "Caches", "Redis")
  Rel(api, queue, "Enqueues jobs", "SQS")
  Rel(worker, queue, "Consumes", "SQS")
  Rel(worker, db, "Reads/writes", "PostgreSQL")
  Rel(api, storage, "Stores files", "S3 SDK")
  Rel(api, stripe, "Payments", "HTTPS")
  Rel(worker, email, "Sends email", "HTTPS")
```

---

## Sequence Diagrams (API flows)

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant FE as Frontend
  participant API as API Service
  participant Redis as Redis Cache
  participant DB as PostgreSQL
  participant Stripe as Stripe API

  User->>FE: Click "Subscribe"
  FE->>API: POST /api/subscriptions
  note over API: Validate JWT + request

  API->>Redis: GET user:session:{id}
  Redis-->>API: Session data

  API->>DB: SELECT * FROM users WHERE id = ?
  DB-->>API: User record

  API->>Stripe: POST /customers
  Stripe-->>API: customer_id

  API->>Stripe: POST /subscriptions
  alt Success
    Stripe-->>API: subscription object
    API->>DB: INSERT INTO subscriptions
    DB-->>API: OK
    API->>Redis: DEL user:cache:{id}
    API-->>FE: 201 { subscription }
    FE-->>User: "Subscription active!"
  else Payment Failed
    Stripe-->>API: card_declined error
    API-->>FE: 402 { error: "PAYMENT_FAILED" }
    FE-->>User: "Payment declined, try another card"
  end
```

---

## Flowcharts (processes, pipelines, decisions)

```mermaid
flowchart TD
  A([User submits form]) --> B{Valid input?}
  B -->|No| C[Show validation errors]
  C --> A
  B -->|Yes| D[Hash password]
  D --> E{Email exists?}
  E -->|Yes| F[Return 409 Conflict]
  E -->|No| G[Create user in DB]
  G --> H[Send welcome email]
  H --> I[Generate JWT]
  I --> J([Return 201 + token])

  style A fill:#22c55e,color:#fff
  style J fill:#22c55e,color:#fff
  style F fill:#ef4444,color:#fff
  style C fill:#f59e0b,color:#fff
```

```mermaid
flowchart LR
  subgraph CI["CI Pipeline"]
    direction LR
    A([Push]) --> B[Lint]
    B --> C[Unit Tests]
    C --> D[Integration Tests]
    D --> E[Security Scan]
    E --> F[Build Image]
  end

  subgraph CD["CD Pipeline"]
    direction LR
    G[Deploy Staging] --> H[E2E Tests]
    H --> I{All pass?}
    I -->|Yes| J{Manual approve}
    I -->|No| K([Notify team])
    J -->|Approved| L[Deploy Prod]
    J -->|Rejected| K
  end

  F --> G

  style A fill:#6366f1,color:#fff
  style L fill:#22c55e,color:#fff
  style K fill:#ef4444,color:#fff
```

---

## State Diagrams

```mermaid
stateDiagram-v2
  [*] --> Draft: User creates task

  Draft --> InReview: Submit for review
  Draft --> Cancelled: User cancels

  InReview --> Approved: Reviewer approves
  InReview --> Rejected: Reviewer rejects
  InReview --> Draft: Request changes

  Rejected --> Draft: User revises
  Approved --> InProgress: Work starts
  InProgress --> Done: Work completed
  InProgress --> Blocked: Blocker found
  Blocked --> InProgress: Blocker resolved

  Done --> [*]
  Cancelled --> [*]

  note right of Blocked
    Escalate to Senior Engineer
    after 24h unresolved
  end note
```

---

## ERD (Database)

```mermaid
erDiagram
  users {
    uuid id PK
    varchar email UK
    varchar name
    varchar role
    timestamptz created_at
  }

  projects {
    uuid id PK
    uuid owner_id FK
    varchar name
    varchar status
    timestamptz created_at
  }

  project_members {
    uuid project_id FK
    uuid user_id FK
    varchar role
    timestamptz joined_at
  }

  tasks {
    uuid id PK
    uuid project_id FK
    uuid assignee_id FK
    varchar title
    varchar status
    int priority
    timestamptz due_date
  }

  users ||--o{ projects : "owns"
  projects ||--o{ project_members : "has members"
  users ||--o{ project_members : "joins"
  projects ||--o{ tasks : "contains"
  users ||--o{ tasks : "assigned to"
```

---

## Mindmap (system components / ownership)

```mermaid
mindmap
  root((My App))
    Frontend
      React SPA
      Tailwind CSS
      React Router
      React Query
    Backend
      Express API
      Sequelize ORM
      JWT Auth
      SQS Worker
    Infrastructure
      AWS ECS Fargate
      RDS PostgreSQL
      ElastiCache Redis
      S3 Storage
      CloudFront CDN
    DevOps
      GitHub Actions
      Terraform IaC
      CloudWatch
      PagerDuty
    AI Features
      Claude API
      ChromaDB
      RAG Pipeline
```

---

## Diagram Quality Rules

```
1. TITLE every diagram — tells reader what they're looking at
2. LESS IS MORE — max 12-15 nodes before it becomes unreadable
3. DIRECTION matters:
   - TD (top-down): pipelines, processes, hierarchies
   - LR (left-right): data flows, request paths
   - Sequence: interactions between actors over time
4. USE SUBGRAPHS to group related components
5. COLOR sparingly: green=success/start, red=error/end, yellow=warning
6. LABELS on arrows tell readers WHAT flows, not just that it flows
   ❌ A --> B
   ✅ A -->|"User data (JWT)"| B
```

---

## Output Files

```
output/docs/diagrams/
  ARCH-[system]-context.md      ← C4 context diagram
  ARCH-[system]-containers.md   ← C4 container diagram
  SEQ-[flow]-sequence.md        ← Sequence diagram
  FLOW-[process]-flow.md        ← Flowchart
  ERD-[domain].md               ← Database ERD
  STATE-[entity]-states.md      ← State machine

Each file format:
  # [Diagram Title]
  [1-sentence description of what this shows]
  
  ```mermaid
  [diagram code]
  ```
  
  ## Key Points
  [2-3 bullets explaining non-obvious aspects]
```

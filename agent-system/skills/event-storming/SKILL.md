---
name: event-storming
description: Use when discovering domain events, mapping business processes, identifying service boundaries, or before designing microservices. Triggers: "event storming", "domain events", "process mapping", "business process", "discover boundaries", "domain discovery", "business events", "what happens when", or at the start of any significant system design to understand the domain before writing code.
---

# Event Storming Skill

Systematically discover domain events, commands, aggregates, policies, and bounded contexts through structured domain exploration. Produces the inputs for DDD service decomposition and LLD design.

---

## What Event Storming Produces

```
Input:  Business domain (described by domain experts or user)
Output:
  1. Domain Event list (everything that happens in the system)
  2. Command list (what triggers each event)
  3. Aggregate list (what "things" hold state and enforce rules)
  4. Policy list (automatic reactions: "when X happens, do Y")
  5. Bounded Context map (service boundary candidates)
  6. Hot spots (questions, conflicts, confusion that need resolution)
```

---

## Phase 1 — Chaotic Exploration (Domain Events)

**Ask: "What happens in this domain?"**

Capture every significant business event. Use past tense. Include unhappy paths.

```
Notation:
  🟠 Domain Event (orange) — "something happened" — past tense
  🔵 Command (blue) — "do something" — imperative
  🟡 Aggregate (yellow) — "thing that holds state"
  🟣 Policy (purple) — "when X, then automatically do Y"
  🔴 Hot Spot (red) — "question / conflict / unclear"
  🟢 External System (green) — "outside this domain"
  👤 User/Actor (person shape) — "who triggers this"
```

**E-commerce example — raw event discovery:**

```
🟠 CustomerRegistered
🟠 CustomerEmailVerified
🟠 ProductCreated
🟠 ProductUpdated
🟠 ProductPublished
🟠 ProductUnpublished
🟠 StockLevelUpdated
🟠 StockDepleted
🟠 CartCreated
🟠 ItemAddedToCart
🟠 ItemRemovedFromCart
🟠 CartAbandoned
🟠 OrderPlaced
🟠 OrderConfirmed
🟠 PaymentInitiated
🟠 PaymentSucceeded
🟠 PaymentFailed
🟠 PaymentRefunded
🟠 OrderShipped
🟠 OrderDelivered
🟠 OrderCancelled
🟠 ReturnRequested
🟠 ReturnApproved
🟠 RefundIssued
🟠 ReviewSubmitted
🟠 ReviewPublished
🟠 ReviewRejected
🟠 DiscountCodeApplied
🟠 LoyaltyPointsEarned
🟠 NotificationSent
🟠 SearchIndexed
```

---

## Phase 2 — Temporal Ordering

Arrange events in chronological order. Find the business flow:

```
TIMELINE ────────────────────────────────────────────────────────────►

[Registration]
CustomerRegistered → VerificationEmailSent → CustomerEmailVerified

[Catalog]
ProductCreated → ProductUpdated → ProductPublished → StockLevelUpdated

[Shopping]
CartCreated → ItemAddedToCart → (CartAbandoned) OR (→ Phase 3)

[Ordering]
OrderPlaced → OrderConfirmed → PaymentInitiated
                ↓                    ↓
           (PaymentFailed)    PaymentSucceeded
                ↓                    ↓
           OrderCancelled     [Fulfillment]
                               StockReserved → OrderShipped → OrderDelivered

[Post-delivery]
ReviewSubmitted → (ReviewApproved OR ReviewRejected)
LoyaltyPointsEarned ← OrderDelivered
NotificationSent ← (many events trigger this)
```

---

## Phase 3 — Add Commands and Actors

For each Domain Event, add the Command that caused it and the Actor who issued it:

```
👤 Customer
  🔵 RegisterCustomer → 🟠 CustomerRegistered
  🔵 AddItemToCart    → 🟠 ItemAddedToCart
  🔵 PlaceOrder       → 🟠 OrderPlaced
  🔵 CancelOrder      → 🟠 OrderCancelled (if policy allows)
  🔵 SubmitReview     → 🟠 ReviewSubmitted

👤 Admin
  🔵 PublishProduct   → 🟠 ProductPublished
  🔵 ApproveReview    → 🟠 ReviewPublished
  🔵 IssueRefund      → 🟠 RefundIssued

🟢 Payment Gateway (External)
  🔵 [webhook]        → 🟠 PaymentSucceeded
  🔵 [webhook]        → 🟠 PaymentFailed

🟣 Policies (automatic reactions):
  When OrderPlaced → automatically → CheckInventory (→ StockReserved or StockDepleted)
  When PaymentSucceeded → automatically → ConfirmOrder, SendConfirmationEmail
  When PaymentFailed → automatically → CancelOrder, NotifyCustomer
  When OrderDelivered → automatically → AwardLoyaltyPoints, TriggerReviewRequest
  When CartAbandoned (24h inactivity) → automatically → SendAbandonmentEmail
```

---

## Phase 4 — Identify Aggregates

Group related commands + events around the "thing" that enforces the rules:

```
🟡 Customer Aggregate
   Commands: RegisterCustomer, VerifyEmail, UpdateProfile
   Events: CustomerRegistered, EmailVerified, ProfileUpdated
   Invariants:
     - Email must be unique
     - Cannot place orders without verified email
     - Cannot have more than 3 active return requests

🟡 Cart Aggregate
   Commands: CreateCart, AddItem, RemoveItem, ApplyDiscount
   Events: CartCreated, ItemAdded, ItemRemoved, DiscountApplied
   Invariants:
     - Max 50 distinct items
     - Cannot add out-of-stock items
     - Discount codes cannot be stacked (one at a time)

🟡 Order Aggregate
   Commands: PlaceOrder, ConfirmOrder, CancelOrder, ShipOrder
   Events: OrderPlaced, OrderConfirmed, OrderCancelled, OrderShipped
   State Machine:
     PENDING → CONFIRMED → FULFILLING → SHIPPED → DELIVERED
     PENDING → CANCELLED
     CONFIRMED → CANCELLED (only if not yet fulfilling)
   Invariants:
     - Cannot ship without payment
     - Cannot cancel after shipped
     - Total must equal sum of items

🟡 Payment Aggregate
   Commands: InitiatePayment, ProcessRefund
   Events: PaymentInitiated, PaymentSucceeded, PaymentFailed, RefundIssued
   Invariants:
     - Refund cannot exceed original payment
     - Cannot initiate payment for already-paid order

🟡 Product Aggregate (in Catalog context)
   Commands: CreateProduct, UpdateProduct, PublishProduct
   Events: ProductCreated, ProductUpdated, ProductPublished
   Invariants:
     - Published product must have at least one image
     - Price must be > 0
     - Cannot unpublish product with pending orders

🟡 InventoryItem Aggregate (in Inventory context — separate!)
   Commands: UpdateStock, ReserveStock, ReleaseReservation
   Events: StockUpdated, StockReserved, StockDepleted, ReservationReleased
   Note: This is "Product" in Inventory context — DIFFERENT from Catalog's Product
```

---

## Phase 5 — Bounded Context Discovery

Group aggregates by linguistic boundary and ownership:

```
Context 1: Identity
  Aggregates: Customer, Session
  Ubiquitous Language: Customer, Verification, Session, Credential
  Events owned: CustomerRegistered, EmailVerified, PasswordReset
  Team: Auth team
  Scale: Low (registration/login ~100 req/s max)

Context 2: Catalog
  Aggregates: Product, Category, Review
  Ubiquitous Language: Product, SKU, Category, Price, Review
  Events owned: ProductPublished, ReviewPublished, PriceChanged
  Team: Content team
  Scale: High read (millions of views), low write

Context 3: Cart
  Aggregates: Cart
  Ubiquitous Language: Cart, LineItem, Discount, Promotion
  Events owned: CartCreated, ItemAdded, CartAbandoned
  Team: Commerce team
  Scale: Very high (every browsing session)

Context 4: Orders
  Aggregates: Order
  Ubiquitous Language: Order, LineItem, Delivery, Cancellation
  Events owned: OrderPlaced, OrderConfirmed, OrderCancelled, OrderDelivered
  Team: Commerce team (or separate)
  Scale: Moderate (purchase conversion ~2-3% of cart sessions)

Context 5: Payments  [ISOLATED — PCI DSS scope]
  Aggregates: Payment, Refund
  Ubiquitous Language: Payment, Authorization, Capture, Refund, Chargeback
  Events owned: PaymentProcessed, RefundIssued
  Team: Payments team (must be PCI compliant)
  Scale: Same as Orders

Context 6: Inventory
  Aggregates: InventoryItem, Warehouse, Reservation
  Ubiquitous Language: SKU (same word as Catalog, but different data!), Stock, Reservation, Location
  Events owned: StockUpdated, StockReserved, StockDepleted
  Team: Fulfillment team
  Scale: Moderate

Context 7: Notifications  [Pure subscriber — no commands from other contexts]
  Aggregates: Notification, Template
  Ubiquitous Language: Notification, Channel, Template, Subscription
  Events owned: NotificationSent, NotificationFailed
  Team: Platform team
  Listens to: ALL events from all other contexts

Hot Spots 🔴 found during storming:
  ❓ Who owns the "customer email" for notifications? Identity? Or Notifications?
     → Decision needed: Identity owns email; Notifications subscribes to changes
  ❓ CartAbandonment — which context detects it? Cart or Notifications?
     → Decision: Cart detects (sets timer), emits CartAbandoned event
  ❓ Can Customer cancel an Order after payment? Within what window?
     → Decision needed from business: yes, within 24h before shipping
```

---

## Phase 6 — Event Storming → Design Artifacts

Translate the session output to design inputs:

```
Event Storming Output → Design Artifact

Domain Events     → AsyncAPI event schema definitions
Aggregates        → DDD aggregate classes (domain-driven-design skill)
Bounded Contexts  → Service boundary candidates (microservice-architect skill)
Policies          → Event-driven automation code
Hot Spots         → ADRs to be written (adr-writer skill)
Context Map       → Integration design (contract-designer skill)
State Machines    → LLD state diagrams (lld-writer skill)
```

**Aggregate → LLD input card:**
```markdown
## Aggregate: Order

State machine: PENDING → CONFIRMED → FULFILLING → SHIPPED → DELIVERED
               PENDING → CANCELLED
               CONFIRMED → CANCELLED

Methods (from commands):
  placeOrder(customerId, items)  → OrderPlaced event
  confirm()                       → OrderConfirmed event
  cancel(reason)                  → OrderCancelled event

Invariants (become validation in entity):
  - Cannot cancel after SHIPPED
  - Cannot confirm without payment
  - Items cannot be empty

Policies triggered by Order events:
  OrderPlaced → CheckInventory (Inventory context)
  OrderPlaced → InitiatePayment (Payments context)
  PaymentSucceeded → ConfirmOrder (Order context — self)
  OrderConfirmed → SendConfirmation (Notifications context)
  OrderDelivered → AwardPoints (Loyalty context)
```

---

## Async Event Storming (written format for distributed teams)

When running event storming asynchronously (via document instead of workshop):

```markdown
## Domain: [Name]

### Step 1 — Events Dump
[Everyone lists domain events they know about, no filter]

### Step 2 — Questions to resolve
For each event, answer:
  - What command caused this event?
  - Who (actor or policy) issued that command?
  - What "thing" (aggregate) changed state?
  - What other events does this event trigger automatically?
  - What can go wrong? (unhappy path events)

### Step 3 — Conflicts to flag
  - Same concept, different names across teams → 🔴 Hot Spot
  - Who owns this event? → 🔴 Hot Spot
  - Multiple aggregates needed for one transaction → 🔴 Hot Spot (rethink aggregate boundaries)
```

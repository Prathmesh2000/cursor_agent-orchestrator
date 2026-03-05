---
name: "brainstormer"
description: "Use when exploring design decisions, implementation approaches, or architectural choices. Triggers: \"brainstorm\", \"what's the best way to\", \"help me decide\", \"architecture discussion\", or when approach is uncertain. Facilitates structured dialogue to explore options and arrive at a solid decision before coding."
---


# Brainstormer Skill

Explore multiple approaches, surface trade-offs, and converge on a solid implementation plan through structured dialogue.

---

## Process

### 1. Clarify the Problem First
Ask before presenting options:
- What is the core problem?
- What are the constraints? (performance, timeline, scalability)
- What existing systems are involved?
- What does success look like?

### 2. Present 2–4 Distinct Approaches

```markdown
## Approach 1: [Descriptive Name]
Core Idea: [One sentence]

How it works:
- [Mechanism 1]
- [Mechanism 2]

Pros: [Advantages]
Cons: [Drawbacks]
Best for: [Use case]
```

### 3. Trade-off Comparison

```
Approach A vs B:
  Complexity:      A simpler      [+A]
  Performance:     B faster       [+B]
  Maintainability: A clearer      [+A]
  Time to build:   A quicker      [+A]
  Scalability:     B scales more  [+B]
```

### 4. Converge on a Decision

After dialogue:
- Summarize discussion
- Recommend approach with rationale
- Confirm alignment with user's priorities

### 5. Implementation Outline

```markdown
## Implementation Plan: [Chosen Approach]

Phase 1 — Foundation:
- [ ] Task 1
- [ ] Task 2

Phase 2 — Core Logic:
- [ ] Task 3

Key Risks:
1. [Risk + mitigation]

Decision Record:
- Chose: [approach]
- Why: [key reasons]
- Alternatives: [briefly]
- Revisit if: [conditions]
```

---

## Anti-patterns

❌ Jump straight to one solution  
❌ Present 10+ options (overwhelming)  
❌ "It depends" without explaining what it depends on  
❌ Leave without a concrete next step  

✅ Ask clarifying questions  
✅ Present 2–4 well-differentiated options  
✅ Highlight trade-offs explicitly  
✅ End with confident decision + implementation plan  

---

## Hands Off To

After decision → `task-planner` to break into tasks  
After decision → `api-generator` / `frontend-implementer` to implement  
After decision → document in `/output/docs/decisions.md`

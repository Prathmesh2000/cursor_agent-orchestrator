---
name: functional-doc-writer
description: Use when creating functional specifications, business requirement documents (BRDs), feature specifications, process flows, use case documents, or stakeholder-facing functional documentation. Triggers: "functional spec", "functional doc", "BRD", "feature spec", "requirements doc", "business requirements", "use case doc", "process flow", "functional requirements", or Doc: trigger for functional output. Always uses brainstormer to discover gaps before writing.
---

# Functional Doc Writer Skill

Create precise, stakeholder-readable functional documentation. Always uses the brainstormer skill to discover gaps, ambiguities, and missing requirements before writing — so the document is complete on first draft.

---

## Process: Brainstorm First, Write Second

```
NEVER write the document without brainstorming first.
The brainstorm phase surfaces:
  - Unstated assumptions that need decisions
  - Edge cases the requester hasn't considered
  - Scope boundaries that need explicit agreement
  - Stakeholder perspectives that may conflict
  - Success criteria that need quantification
```

### Brainstorm Questions (run before every doc)

```
Act as brainstormer. Before writing [doc type] for [feature/system], 
ask the following to fill gaps:

SCOPE:
  - What is in scope for this version (v1)?
  - What is explicitly out of scope?
  - What future versions are anticipated?

USERS:
  - Who are all the user types that interact with this?
  - What are their goals for each interaction?
  - What permissions or roles exist?

FLOWS:
  - What triggers each process?
  - What are all the happy-path steps?
  - What happens on every error or exception?
  - Are there time limits, deadlines, or SLAs?

DATA:
  - What data is created, read, updated, or deleted?
  - What are the validation rules for each field?
  - What data comes from external systems?

BUSINESS RULES:
  - What calculations or formulas apply?
  - What are the approval or workflow rules?
  - What are the access control rules?
  - Are there legal, compliance, or audit requirements?

INTEGRATION:
  - What systems does this connect to?
  - What triggers communication with other systems?
  - What is the fallback if an integration fails?
```

---

## Document Templates

### 1. Feature Specification

```markdown
# Feature Specification: [Feature Name]

**Document ID:**  FS-[NNN]  
**Version:**      1.0  
**Status:**       Draft | Review | Approved  
**Author:**       [name]  
**Reviewers:**    [list]  
**Last Updated:** [date]  
**Approved By:**  [name + date]  

---

## 1. Purpose
[Why this feature exists. What user problem it solves. 2-3 sentences.]

## 2. Background
[Context. What exists today. Why the current state is insufficient.]

## 3. Goals
| Goal | Metric | Target |
|------|--------|--------|
| [goal] | [how measured] | [quantified target] |

## 4. Non-Goals
The following are explicitly NOT in scope for this version:
- [thing excluded + reason]
- [thing excluded + reason]

## 5. User Personas
### [Persona Name]
- **Who they are:** [description]
- **Their goal:** [what they want to achieve]
- **Pain point solved:** [how this feature helps them]

## 6. User Stories
### Must Have (P0)
- US-001: As a [persona], I want to [action] so that [outcome]
  - Acceptance criteria:
    - [ ] Given [context], when [action], then [result]
    - [ ] Given [context], when [action], then [result]

### Should Have (P1)
- US-002: ...

### Nice to Have (P2)
- US-003: ...

## 7. Functional Requirements

### FR-001: [Requirement Name]
**Description:** [Clear statement of what the system must do]  
**Priority:** P0 | P1 | P2  
**User story:** US-001  

Business rules:
- BR-001: [specific rule, formula, or constraint]
- BR-002: [specific rule]

Validation rules:
- [Field]: [rule — e.g., "Required, max 100 chars, alphanumeric only"]

Error conditions:
- If [condition]: show [message], do [action]
- If [condition]: show [message], do [action]

---

### FR-002: [Requirement Name]
[Repeat structure]

## 8. Process Flows

### Flow 1: [Process Name]
**Trigger:** [What starts this flow]  
**Actor:** [Who performs it]  
**Preconditions:** [What must be true before starting]  

Steps:
1. [Actor] [does action]
2. System [responds with]
3. [Actor] [does next action]
   - Alternative: If [condition], system [does X] instead

**Postconditions:** [State of the world after successful completion]  
**Error exits:** [All ways this flow can fail + what happens]

## 9. Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-001 | [rule statement] | [concrete example] |
| BR-002 | [rule statement] | [concrete example] |

## 10. Data Requirements

| Field | Type | Required | Validation | Source |
|-------|------|----------|------------|--------|
| [field] | String | Yes | Max 100 chars | User input |
| [field] | Number | Yes | > 0, integer | Calculated |

## 11. Permissions & Access Control

| Role | Can View | Can Create | Can Edit | Can Delete |
|------|----------|------------|----------|------------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| User | ✅ | ✅ | Own only | ❌ |
| Guest | ✅ | ❌ | ❌ | ❌ |

## 12. Integration Points

| System | Direction | Trigger | Data Exchanged | Failure Handling |
|--------|-----------|---------|----------------|-----------------|
| [System] | Outbound | [when] | [what] | [fallback] |

## 13. Non-Functional Requirements
- **Performance:** [e.g., page loads in < 2s at 100 concurrent users]
- **Availability:** [e.g., 99.9% uptime, < 1h downtime/month]
- **Security:** [e.g., data encrypted, audit log required]
- **Compliance:** [e.g., GDPR, HIPAA, SOX]

## 14. Open Questions
| # | Question | Owner | Due Date | Answer |
|---|----------|-------|----------|--------|
| 1 | [question] | [name] | [date] | TBD |

## 15. Assumptions
- [Assumption 1: what we're assuming to be true]
- [Assumption 2]

## 16. Acceptance Criteria
Tested by: [QA Lead name]  
Sign-off: [PM name + date]  

- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Edge case tested: X]

## 17. Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [date] | [name] | Initial draft |
```

---

### 2. Business Requirements Document (BRD)

```markdown
# Business Requirements Document: [Initiative Name]

**Document ID:** BRD-[NNN]  
**Version:** 1.0  
**Status:** Draft | Under Review | Approved  
**Business Owner:** [name + role]  
**Prepared By:** [name]  
**Date:** [date]  

---

## Executive Summary
[3-5 sentences: what is being requested, why, and the expected business outcome]

## Business Problem / Opportunity
### Current State
[How things work today. Data, pain points, inefficiencies.]

### Desired State
[How things should work. What the business gains.]

### Gap Analysis
| Area | Current State | Desired State | Gap |
|------|--------------|--------------|-----|
| [area] | [now] | [target] | [what's missing] |

## Business Objectives
| Objective | KPI | Baseline | Target | Timeline |
|-----------|-----|----------|--------|----------|
| [obj] | [metric] | [now] | [goal] | [when] |

## Scope
### In Scope
- [business process 1]
- [business process 2]

### Out of Scope
- [excluded process + reason]

## Stakeholders
| Name | Role | Interest | Involvement |
|------|------|----------|-------------|
| [name] | [title] | [what they care about] | Approver / Reviewer / Informed |

## Business Requirements
### Must Have
- BRQ-001: [Plain English requirement — no technical jargon]
- BRQ-002: [requirement]

### Should Have
- BRQ-003: [requirement]

## Constraints
- **Budget:** [amount or range]
- **Timeline:** [deadline]
- **Technology:** [constraints]
- **Regulatory:** [compliance requirements]

## Assumptions & Dependencies
- [assumption]
- [dependency on another system or team]

## Success Criteria
This initiative is successful when:
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

## Approval
| Role | Name | Signature | Date |
|------|------|-----------|------|
| Business Owner | | | |
| Product Manager | | | |
| Engineering Lead | | | |
```

---

## Writing Principles

```
1. Write for the reader who has no context
   — They should understand the WHAT and WHY without asking questions

2. Use concrete examples everywhere
   — Bad: "The system validates the input"
   — Good: "If the user enters an email without '@', the system shows
            'Please enter a valid email address' below the field"

3. Quantify everything
   — Bad: "The system should be fast"
   — Good: "The page loads in < 2 seconds at 95th percentile"

4. Distinguish must/should/could (MoSCoW)
   — Must = system fails without it
   — Should = high value, ship in v1 if possible
   — Could = nice to have, defer to v2

5. Every business rule is a testable statement
   — Bad: "Discounts are applied based on membership"
   — Good: "Gold members receive 20% discount on all orders.
            Silver members receive 10%. Basic members receive 0%."
```

---

## Output Files

```
output/docs/
  FS-[NNN]-[feature-name].md     ← Feature Specification
  BRD-[NNN]-[initiative].md      ← Business Requirements Doc
  PROCESS-[name].md              ← Process flow docs
```

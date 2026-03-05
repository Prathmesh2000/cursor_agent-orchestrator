---
name: "document-expert"
description: "Use for reviewing, auditing, or creating technical documentation. Triggers: \"review docs\", \"check README\", \"API documentation\", \"create docs\", \"document this\", or at the end of every Workflow: run."
---


# Document Expert Skill

Review and create accurate, complete, maintainable documentation. Run at the end of every feature delivery.

---

## Documentation Review Checklist

### API Docs
- [ ] All endpoints documented
- [ ] Request/response examples accurate and tested
- [ ] Error codes listed and explained
- [ ] Auth method documented
- [ ] Rate limits specified
- [ ] Versioning noted

### README
- [ ] Install instructions work end-to-end
- [ ] Examples are runnable as-is
- [ ] Prerequisites listed with versions
- [ ] No broken links
- [ ] Version numbers current

### Code Comments
- [ ] Complex logic explained (WHY, not just what)
- [ ] TODOs have context and owner
- [ ] No stale/outdated comments

### Architecture Docs
- [ ] Diagrams match current system
- [ ] All services documented
- [ ] Decision rationale present
- [ ] Trade-offs recorded

---

## Review Report Template

```markdown
# Documentation Review — [Feature]

## Critical 🔴 (Must fix before release)
1. [Issue] — [Impact] — [Fix needed]

## Important 🟡 (Fix this sprint)
1. [Issue] — [Recommendation]

## Minor 🔵 (Nice to have)
1. [Suggestion]

## Scores
Accuracy:     [1–5]
Completeness: [1–5]
Clarity:      [1–5]
Overall:      [1–5]
```

---

## Required Docs for Every Feature

```markdown
output/docs/
  PRD-[feature].md        ← requirements (from Planner)
  decisions.md            ← architecture decisions log
  security-report.md      ← security analyst output
  qa-report.md            ← QA test results
  api-[feature].md        ← API endpoint docs (if applicable)
  README.md               ← updated if setup changed
```

---

## API Doc Template

```markdown
## POST /api/[resource]

Description: [What this endpoint does]

Auth: Bearer token required

Request:
\`\`\`json
{
  "field": "value"   // type, required/optional
}
\`\`\`

Response 200:
\`\`\`json
{
  "id": "uuid",
  "field": "value"
}
\`\`\`

Errors:
| Code | Reason |
|------|--------|
| 400 | Validation failed — [field] is required |
| 401 | Token missing or expired |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
```

---

## Architecture Decision Record (ADR)

```markdown
## ADR-[N]: [Decision Title]
Date: [date]
Status: Accepted | Superseded

### Context
[Why this decision was needed]

### Decision
[What was chosen]

### Consequences
Positive: [benefits]
Negative: [tradeoffs accepted]

### Alternatives Considered
- [Option A] — rejected because [reason]
- [Option B] — rejected because [reason]
```

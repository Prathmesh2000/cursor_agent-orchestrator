---
name: "debugger"
description: "Use when debugging bugs, errors, unexpected behavior, or stack traces. Triggers: \"bug\", \"error\", \"not working\", \"broken\", stack trace pasted, or unexpected output. Performs systematic RCA and presents solution options."
---


# Debugger Skill

Systematic bug analysis: gather info → parse error → hypothesize → isolate cause → RCA → solution options.

---

## Step 1 — Gather Information

Ask for:
```
1. Expected behavior vs actual behavior
2. Error message / stack trace (paste it)
3. Terminal output
4. Relevant code section
5. When it started / what changed recently
6. Steps to reproduce
7. Environment (dev/staging/prod, OS, Node version, browser)
```

---

## Step 2 — Parse the Stack Trace

```
Example:
TypeError: Cannot read property 'id' of undefined
    at getUserData (user.service.js:45:23)
    at processUser (user.controller.js:12:19)

Analysis:
  Error type:  TypeError
  Root hint:   'id' accessed on undefined
  Origin:      user.service.js line 45
  Call chain:  controller → service
  Hypothesis:  user object is undefined when passed to service
```

---

## Step 3 — RCA Report

```markdown
# RCA: [Bug Name]

## Summary
[1-sentence description of the bug]

## Root Cause
[Technical explanation of WHY this happens]

## Evidence
[Error message / relevant log lines]

## Contributing Factors
1. [Factor 1]
2. [Factor 2]

## Impact
- Severity: Critical / High / Medium / Low
- Users affected: [scope]
- Data integrity risk: Yes / No

## Timeline
- Started: [when]
- Reported: [when]
```

---

## Step 4 — Solution Options

Present 2–4 options ranked by safety/effort:

```
Option A — Quick Fix ⚡
  Effort: 30 min | Risk: Low
  Approach: [what to do]
  Tradeoff: [what you give up]

Option B — Proper Fix ✅ (Recommended)
  Effort: 2h | Risk: Very Low
  Approach: [what to do]
  Tradeoff: [what you give up]

Option C — Architectural Fix 🏗️
  Effort: 1 day | Risk: Medium
  Approach: [what to do]
  Tradeoff: [what you give up]

Which option? (A / B / C)
```

---

## Step 5 — Implement + Verify

After choice is made:
- Implement the fix
- Add/update unit tests to cover the bug scenario
- Verify fix resolves the original issue
- Add code comment explaining the fix

---

## Step 6 — Prevention

```markdown
## Prevention
1. [Add guard clause / validation / test]
2. [Monitoring or alerting to detect this earlier]
3. [Process improvement to avoid recurrence]
```

---

## Common Patterns

| Error Type | First Hypothesis |
|---|---|
| `Cannot read property of undefined` | Object is null/undefined before access |
| `is not a function` | Wrong import or name mismatch |
| `404 Not Found` | Route mismatch or wrong base URL |
| `401 Unauthorized` | Token missing, expired, or malformed |
| `500 Internal Server Error` | Unhandled exception in server code |
| `CORS error` | Missing/wrong CORS header config |
| `Module not found` | Missing install or wrong import path |

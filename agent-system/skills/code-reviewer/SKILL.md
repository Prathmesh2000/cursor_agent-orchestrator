---
name: "code-reviewer"
description: "Use when reviewing code for quality, correctness, security, performance, and maintainability. Triggers: \"review this code\", \"code review\", \"PR review\", \"check my code\", \"review before merge\", or automatically in Workflow: Phase 5 after every engineering task. Every piece of code gets reviewed before testing."
---


# Code Reviewer Skill

Systematic code review that catches bugs, security issues, performance problems, and maintainability concerns before they reach production.

---

## Review Dimensions (Check All)

```
1. CORRECTNESS      Does it do what it's supposed to do?
2. SECURITY         Can it be exploited or abused?
3. PERFORMANCE      Will it scale? Any N+1 or memory leaks?
4. MAINTAINABILITY  Will the next developer understand this?
5. TEST COVERAGE    Are the right things tested?
6. ERROR HANDLING   Does it fail safely and informatively?
7. STANDARDS        Does it follow project conventions?
```

---

## Full Review Checklist

### Correctness
- [ ] Logic matches requirements / acceptance criteria
- [ ] All conditions handled (if/else completeness)
- [ ] Return values used correctly by callers
- [ ] Async/await used correctly (no floating promises)
- [ ] Array/object mutations don't cause unexpected side effects
- [ ] Off-by-one errors checked on loops and slices

### Security
- [ ] No hardcoded secrets, credentials, or API keys
- [ ] User input sanitized before use in queries/commands
- [ ] SQL uses parameterized queries (never string concat)
- [ ] Authorization check before accessing resources (not just auth)
- [ ] Sensitive data not logged (passwords, tokens, PII)
- [ ] File uploads validated (type, size, content)
- [ ] No `eval()`, `exec()`, or `shell()` with user input

### Performance
- [ ] No N+1 queries (loop inside loop calling DB)
- [ ] Large datasets paginated, not loaded all at once
- [ ] Indexes exist for queried columns
- [ ] No synchronous operations blocking event loop (Node.js)
- [ ] Memory leaks: event listeners cleaned up, intervals cleared
- [ ] Expensive computations cached where appropriate

### Maintainability
- [ ] Functions do one thing (single responsibility)
- [ ] Function/variable names are descriptive (no `x`, `temp`, `data`)
- [ ] Complex logic has explanatory comments (WHY, not what)
- [ ] No magic numbers (use named constants)
- [ ] DRY principle: no duplicated logic blocks
- [ ] Functions < 50 lines, files < 300 lines
- [ ] Nested callbacks/ternaries refactored

### Error Handling
- [ ] All async operations have try/catch or .catch()
- [ ] Errors are informative (message + context, not just "Error")
- [ ] Errors are logged with enough context to debug
- [ ] User-facing errors don't leak internal details
- [ ] Partial failures handled (transaction rollbacks)

### Test Coverage
- [ ] Happy path tested
- [ ] Error paths tested
- [ ] Boundary conditions tested
- [ ] Mocks used correctly (not mocking what you're testing)
- [ ] No tests that only verify it doesn't throw

---

## Code Review Output Format

```markdown
## Code Review: [Task ID] — [File/Feature]
Reviewer: Code Reviewer Agent
Date: [date]
Status: APPROVED ✅ / CHANGES REQUIRED 🔄 / BLOCKED 🔴

---

### 🔴 Critical (must fix before merge)
These are bugs, security vulnerabilities, or major correctness issues.

**[File:Line]** — [Issue title]
\`\`\`javascript
// Current (problematic)
const user = db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);
\`\`\`
Problem: SQL injection — user controls `req.params.id` directly.
Fix:
\`\`\`javascript
const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
\`\`\`

---

### 🟡 Important (should fix this PR)
These are performance issues, poor error handling, or maintainability problems.

**[File:Line]** — N+1 query in user list
\`\`\`javascript
// Current — N+1: one query per user to get their posts
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });
}
\`\`\`
Fix:
\`\`\`javascript
// One query with eager loading
const users = await User.findAll({ include: [{ model: Post, as: 'posts' }] });
\`\`\`

---

### 🔵 Minor (can be follow-up)
Style, naming, or small improvements.

**[File:Line]** — Magic number
\`\`\`javascript
// Current
if (attempts > 5) { ... }

// Suggested
const MAX_LOGIN_ATTEMPTS = 5;
if (attempts > MAX_LOGIN_ATTEMPTS) { ... }
\`\`\`

---

### ✅ What's Good
- Error handling is thorough throughout the service layer
- Consistent naming convention maintained
- Test coverage looks solid for the happy path

---

### Summary
Critical issues: [N]
Important issues: [N]  
Minor issues: [N]

Decision: [APPROVED / CHANGES REQUIRED / BLOCKED]
[If changes required: "Re-review after critical + important items fixed"]
```

---

## Common Issues Quick Reference

### JavaScript / TypeScript

```javascript
// ❌ Floating promise (unhandled rejection)
async function handler() {
  doSomethingAsync(); // no await, no .catch()
}

// ✅ Awaited
async function handler() {
  await doSomethingAsync();
}

// ❌ Mutating function parameter
function processUser(user) {
  user.name = user.name.trim(); // mutates caller's object
}

// ✅ Return new object
function processUser(user) {
  return { ...user, name: user.name.trim() };
}

// ❌ N+1 query
const orders = await Order.findAll();
for (const order of orders) {
  order.user = await User.findByPk(order.userId);
}

// ✅ Single query with join
const orders = await Order.findAll({
  include: [{ model: User, as: 'user' }]
});

// ❌ Catching but not handling
try {
  await saveUser(user);
} catch (e) {
  console.log(e); // logged but swallowed — caller doesn't know it failed
}

// ✅ Re-throw or proper handling
try {
  await saveUser(user);
} catch (e) {
  logger.error('Failed to save user', { userId: user.id, error: e.message });
  throw new DatabaseError('User save failed', { cause: e });
}
```

### React

```jsx
// ❌ Missing dependency in useEffect
useEffect(() => {
  fetchData(userId); // userId changes but effect doesn't re-run
}, []);

// ✅ Correct dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]);

// ❌ State update on unmounted component
useEffect(() => {
  fetch('/api/data').then(res => res.json()).then(data => {
    setData(data); // component may be unmounted by now
  });
}, []);

// ✅ Cleanup with AbortController
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(data => setData(data))
    .catch(e => { if (e.name !== 'AbortError') setError(e); });
  return () => controller.abort();
}, []);
```

---

## Severity Definitions

| Level | Meaning | Action |
|---|---|---|
| 🔴 Critical | Security vulnerability, data loss risk, broken functionality | Block merge — must fix |
| 🟡 Important | Performance issue, poor error handling, high tech debt | Fix this PR |
| 🔵 Minor | Style, naming, small improvements | Fix or track as tech debt |
| 💡 Suggestion | Optional improvement, not a problem | Author's discretion |

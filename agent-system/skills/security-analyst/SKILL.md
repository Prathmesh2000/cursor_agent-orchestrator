---
name: security-analyst
description: Use for security review, vulnerability assessment, threat modeling, or security testing. Triggers: "security", "vulnerability", "pen test", "OWASP", "SQL injection", "XSS", "auth security", or any user-facing / data-sensitive feature.
---

# Security Analyst Skill

Identify vulnerabilities, assess risk, and provide actionable remediation. Run on every Workflow: phase and any auth/payment/data feature.

---

## OWASP Top 10 Checklist (Run Every Time)

### A01 — Broken Access Control
- [ ] Unauthorized resource access blocked
- [ ] Privilege escalation prevented
- [ ] CORS configured correctly
- [ ] IDOR (direct object reference) checks in place

### A02 — Cryptographic Failures
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced everywhere
- [ ] Passwords hashed (bcrypt ≥ 10 rounds)
- [ ] No secrets in code/logs

### A03 — Injection
- [ ] SQL injection: parameterized queries used
- [ ] NoSQL injection: input sanitized
- [ ] XSS: output escaped, CSP header set
- [ ] Command injection: no shell calls with user input

### A04 — Insecure Design
- [ ] Threat model documented
- [ ] Security requirements defined in PRD
- [ ] Fail-secure defaults

### A05 — Security Misconfiguration
- [ ] Default credentials changed
- [ ] Debug mode off in production
- [ ] Security headers present (CSP, HSTS, X-Frame-Options)
- [ ] Error messages don't leak internals

### A06 — Vulnerable Components
- [ ] Dependencies up to date (`npm audit`)
- [ ] No known CVEs in use

### A07 — Auth Failures
- [ ] Brute force protection (rate limiting)
- [ ] Session invalidated on logout
- [ ] JWT properly signed and verified
- [ ] Password reset links expire

### A08 — Integrity Failures
- [ ] Deserialization is safe
- [ ] File uploads validated (type + size)

### A09 — Logging Failures
- [ ] Auth events logged
- [ ] Failed login attempts logged
- [ ] Sensitive data NOT logged (passwords, tokens)

### A10 — SSRF
- [ ] External URL inputs validated
- [ ] Server-side requests use allowlist

---

## Risk Assessment Output

```markdown
## Security Risk Assessment

### Risks Found
| Risk | Severity | Location | Mitigation |
|------|----------|----------|------------|
| No rate limiting on /api/auth/login | High | auth.controller.js | Add express-rate-limit |
| JWT secret hardcoded | Critical | config.js | Move to env variable |
| SQL query uses string concat | Critical | user.repo.js | Use parameterized query |

### Security Requirements Added to Build
- SEC-01: Rate limit auth endpoints (5 req/15min per IP)
- SEC-02: Move all secrets to environment variables
- SEC-03: Add parameterized queries to user repo

### Sign-off
✅ Approved — no blocking issues
OR
❌ Blocked — [critical issues that must be fixed before proceeding]
```

---

## Common Fixes

**Rate Limiting (Express)**
```javascript
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many attempts, please try again later'
});
app.use('/api/auth', authLimiter);
```

**Password Hashing**
```javascript
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;
const hash = await bcrypt.hash(password, SALT_ROUNDS);
const valid = await bcrypt.compare(password, hash);
```

**JWT Best Practices**
```javascript
// Short-lived access token (15 min)
const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
// Longer refresh token (7 days)
const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
```

**Security Headers**
```javascript
const helmet = require('helmet');
app.use(helmet()); // Sets CSP, HSTS, X-Frame-Options, etc.
```

**SQL Injection Prevention (Sequelize)**
```javascript
// ❌ Never
User.findAll({ where: `email = '${email}'` });

// ✅ Always
User.findAll({ where: { email: email } });
```

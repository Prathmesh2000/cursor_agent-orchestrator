---
name: error-handler
description: Use when designing error handling strategy, error codes, retry logic, circuit breakers, fallback patterns, or auditing existing error handling for gaps. Triggers: "error handling", "error codes", "retry logic", "circuit breaker", "fallback", "graceful degradation", "exception handling", "error taxonomy", or when errors are swallowed, inconsistent, or provide no actionable feedback.
---

# Error Handler Skill

Design comprehensive error handling: taxonomy, consistent error responses, retry strategies, circuit breakers, and graceful degradation. Errors are first-class features, not afterthoughts.

---

## Error Taxonomy

```
ERRORS BY ORIGIN:

  Validation Errors (4xx — client's fault)
    400 Bad Request      → Invalid input format or business rule violation
    401 Unauthorized     → Authentication missing or expired
    403 Forbidden        → Authenticated but not permitted
    404 Not Found        → Resource doesn't exist
    409 Conflict         → State conflict (duplicate, version mismatch)
    422 Unprocessable    → Valid format, fails business validation
    429 Too Many Requests→ Rate limit exceeded

  Server Errors (5xx — our fault)
    500 Internal Server  → Unexpected crash — never expose internals
    502 Bad Gateway      → Upstream dependency failed
    503 Service Unavail  → Intentional (maintenance, overload shedding)
    504 Gateway Timeout  → Upstream took too long

ERRORS BY SEVERITY:
  Critical  → Data loss risk or security breach → page immediately
  High      → Feature broken for all users      → alert + fix within 1h
  Medium    → Feature degraded                  → fix within 1 day
  Low       → Minor inconvenience               → fix in next sprint
```

---

## Standard Error Response Format

```typescript
// Always return this shape — never expose stack traces in production
interface ErrorResponse {
  success: false;
  error: {
    code: string;       // machine-readable: "VALIDATION_FAILED"
    message: string;    // human-readable: "Email address is invalid"
    requestId: string;  // correlates to logs
    details?: Array<{   // field-level errors for validation
      field: string;
      message: string;
    }>;
  };
}

// ✅ Good error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "requestId": "req_abc123",
    "details": [
      { "field": "email", "message": "Must be a valid email address" },
      { "field": "password", "message": "Must be at least 12 characters" }
    ]
  }
}

// ❌ Never expose internals
{
  "error": "TypeError: Cannot read property 'id' of undefined at User.findById..."
}
```

---

## Global Error Handler (Express)

```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, code, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // vs programmer errors
  }
}

// Named constructors for common errors
AppError.badRequest    = (msg, details) => new AppError(msg, 400, 'BAD_REQUEST', details);
AppError.unauthorized  = (msg = 'Authentication required') => new AppError(msg, 401, 'UNAUTHORIZED');
AppError.forbidden     = (msg = 'Access denied') => new AppError(msg, 403, 'FORBIDDEN');
AppError.notFound      = (resource) => new AppError(`${resource} not found`, 404, 'NOT_FOUND');
AppError.conflict      = (msg) => new AppError(msg, 409, 'CONFLICT');
AppError.validation    = (details) => new AppError('Validation failed', 422, 'VALIDATION_FAILED', details);
AppError.tooManyReq    = () => new AppError('Rate limit exceeded', 429, 'RATE_LIMITED');
AppError.internal      = () => new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR');

// Global error handler — MUST be last middleware
function errorHandler(err, req, res, next) {
  // Log everything — operational and programmer errors
  const isOperational = err.isOperational === true;

  logger[isOperational ? 'warn' : 'error']('Request error', {
    requestId: req.requestId,
    error: err.message,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    stack: isOperational ? undefined : err.stack, // stack only for bugs
  });

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const details = err.errors.map(e => ({ field: e.path, message: e.message }));
    return res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: 'Validation failed', requestId: req.requestId, details }
    });
  }

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path;
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `${field} already exists`, requestId: req.requestId }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token', requestId: req.requestId }
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Authentication token expired', requestId: req.requestId }
    });
  }

  // Operational errors (known, intentional)
  if (isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, requestId: req.requestId, details: err.details }
    });
  }

  // Programmer errors — hide internals
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId: req.requestId }
  });
}

// Handle 404 (route not found)
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found`, requestId: req.requestId }
  });
}

// Catch unhandled rejections (programmer errors — crash and restart)
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1); // let process manager (ECS/K8s) restart
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

module.exports = { AppError, errorHandler, notFoundHandler };
```

---

## Retry Logic with Exponential Backoff

```javascript
// utils/retry.js
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 100,
    maxDelayMs = 10000,
    factor = 2,
    jitter = true,
    retryOn = (error) => error.statusCode >= 500 || error.code === 'ECONNRESET',
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !retryOn(error)) {
        throw error;
      }

      // Exponential backoff with optional jitter
      const delay = Math.min(baseDelayMs * Math.pow(factor, attempt - 1), maxDelayMs);
      const jitteredDelay = jitter ? delay * (0.5 + Math.random() * 0.5) : delay;

      logger.warn('Retrying after error', {
        attempt,
        maxAttempts,
        delayMs: Math.round(jitteredDelay),
        error: error.message,
      });

      await sleep(jitteredDelay);
    }
  }

  throw lastError;
}

// Usage
const user = await withRetry(
  () => externalApi.getUser(userId),
  { maxAttempts: 3, retryOn: (e) => e.status === 503 }
);
```

---

## Circuit Breaker

```javascript
// utils/circuitBreaker.js
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.threshold = options.threshold || 5;    // failures before open
    this.timeout = options.timeout || 60000;    // ms before half-open retry
    this.state = 'CLOSED';   // CLOSED → OPEN → HALF_OPEN → CLOSED
    this.failureCount = 0;
    this.nextAttempt = null;
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new AppError(
          `Service ${this.name} is temporarily unavailable`,
          503, 'CIRCUIT_OPEN'
        );
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error('Circuit breaker OPENED', { service: this.name, failures: this.failureCount });
    }
  }
}

// Usage
const paymentBreaker = new CircuitBreaker('stripe', { threshold: 5, timeout: 30000 });

async function processPayment(data) {
  return paymentBreaker.call(() => stripeClient.charge(data));
}
```

---

## Error Code Registry

```markdown
## Error Code Reference

| Code | HTTP | Meaning | User Message |
|------|------|---------|-------------|
| VALIDATION_FAILED | 422 | Input fails validation rules | "Please correct the highlighted fields" |
| UNAUTHORIZED | 401 | No/invalid auth token | "Please sign in to continue" |
| TOKEN_EXPIRED | 401 | JWT expired | "Your session has expired, please sign in again" |
| FORBIDDEN | 403 | Valid auth, no permission | "You don't have permission to do this" |
| NOT_FOUND | 404 | Resource doesn't exist | "[Resource] was not found" |
| CONFLICT | 409 | Duplicate / state conflict | "[Field] already exists" |
| RATE_LIMITED | 429 | Too many requests | "Too many attempts, please wait [X] seconds" |
| CIRCUIT_OPEN | 503 | Dependency unavailable | "This feature is temporarily unavailable" |
| INTERNAL_ERROR | 500 | Unexpected crash | "Something went wrong, we've been notified" |
```

---

## Output Files

```
output/code/
  middleware/errorHandler.js   ← Global error handler
  utils/retry.js               ← Retry with backoff
  utils/circuitBreaker.js      ← Circuit breaker
  utils/AppError.js            ← Error class hierarchy
output/docs/
  ERROR-CODES.md               ← Error code registry
```

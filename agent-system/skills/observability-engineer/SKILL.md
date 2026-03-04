---
name: observability-engineer
description: Use when setting up logging, metrics, distributed tracing, alerting, dashboards, or SLOs. Triggers: "logging", "metrics", "monitoring", "alerting", "tracing", "dashboard", "observability", "SLO", "SLA", "CloudWatch", "Datadog", "Grafana", "Prometheus", "OpenTelemetry", "structured logs", or when you can't tell why production is behaving unexpectedly.
---

# Observability Engineer Skill

Build the three pillars of observability: Logs (what happened), Metrics (how the system is performing), Traces (where time was spent). Plus alerting and SLOs.

---

## Three Pillars

```
LOGS     → What happened? Specific events with context.
METRICS  → How is the system performing? Numbers over time.
TRACES   → Where did the time go? Request path across services.
```

---

## Structured Logging (Node.js — Winston + JSON)

```javascript
// utils/logger.js — production structured logger
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()    // Always JSON in production
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'my-app',
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
    // Add CloudWatch / Datadog transport for production
  ],
});

module.exports = logger;

// USAGE — always include context object, never just a string
// ❌ Bad
logger.info('User logged in');

// ✅ Good — searchable, filterable, correlatable
logger.info('User authenticated', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  duration: Date.now() - startTime,
});

// ✅ Error with full context
logger.error('Payment processing failed', {
  error: error.message,
  stack: error.stack,
  userId: user.id,
  orderId: order.id,
  amount: order.total,
  provider: 'stripe',
});
```

### Request Correlation (trace requests end-to-end)

```javascript
// middleware/requestLogger.js
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

module.exports = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  const startTime = Date.now();

  // Attach to request for downstream use
  req.requestId = requestId;
  req.log = logger.child({ requestId });  // All logs from this request include requestId

  // Propagate to downstream services
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    req.log.info('HTTP request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - startTime,
      contentLength: res.getHeader('content-length'),
    });
  });

  next();
};
```

---

## Metrics (Prometheus + Node.js)

```javascript
// utils/metrics.js
const client = require('prom-client');

// Collect default Node.js metrics (CPU, memory, event loop)
client.collectDefaultMetrics({ prefix: 'myapp_' });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'myapp_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],  // SLA-aligned buckets
});

const httpRequestTotal = new client.Counter({
  name: 'myapp_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const activeConnections = new client.Gauge({
  name: 'myapp_active_connections',
  help: 'Number of active connections',
});

const dbQueryDuration = new client.Histogram({
  name: 'myapp_db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Middleware to auto-instrument all routes
function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  activeConnections.inc();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    };
    end(labels);
    httpRequestTotal.inc(labels);
    activeConnections.dec();
  });

  next();
}

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports = { httpRequestDuration, dbQueryDuration, metricsMiddleware };
```

---

## Distributed Tracing (OpenTelemetry)

```javascript
// tracing.js — initialize BEFORE requiring other modules
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
    }),
  ],
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown());

// Add custom spans for business operations
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('my-app');

async function processPayment(userId, amount) {
  return tracer.startActiveSpan('process-payment', async (span) => {
    span.setAttributes({
      'payment.user_id': userId,
      'payment.amount': amount,
      'payment.currency': 'USD',
    });
    try {
      const result = await stripeClient.charge(amount);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## CloudWatch Dashboards (AWS)

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Request Rate & Error Rate",
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "app/my-alb/xxx"],
          ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", "app/my-alb/xxx"]
        ],
        "period": 60,
        "stat": "Sum",
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "API Latency (p50/p95/p99)",
        "metrics": [
          ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "app/my-alb/xxx", {"stat":"p50"}],
          ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "app/my-alb/xxx", {"stat":"p95"}],
          ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "app/my-alb/xxx", {"stat":"p99"}]
        ],
        "period": 60,
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "ECS CPU & Memory",
        "metrics": [
          ["AWS/ECS", "CPUUtilization", "ServiceName", "my-app", "ClusterName", "production"],
          ["AWS/ECS", "MemoryUtilization", "ServiceName", "my-app", "ClusterName", "production"]
        ],
        "period": 60,
        "view": "timeSeries"
      }
    }
  ]
}
```

---

## SLO Definition & Error Budgets

```markdown
## SLO Definition: [Service Name]

### Availability SLO
Target: 99.9% uptime (43.8 min downtime/month allowed)
Measurement: Successful requests / Total requests
Window: Rolling 30 days
Alert: Page when error budget < 50% remaining

### Latency SLO  
Target: 95% of requests < 300ms
Measurement: p95 latency from ALB metrics
Window: Rolling 7 days
Alert: Page when p95 > 500ms for 5+ minutes

### Error Budget Calculation
Monthly budget:    43.8 minutes (99.9% of 43,200 min)
Burn rate alert:   If consuming budget 5x faster than normal
Fast burn alert:   > 5% budget consumed in 1 hour → page immediately
Slow burn alert:   > 10% budget consumed in 6 hours → ticket
```

---

## Alert Runbook Template

```markdown
## Alert: [Alert Name]
Severity: P1 | P2 | P3
Channel: PagerDuty | Slack #alerts

### What it means
[Plain English: what is wrong when this fires]

### Immediate actions (< 5 min)
1. Check [dashboard link]
2. Run: `[command to get more context]`
3. If [symptom]: do [action]

### Probable causes
- [Cause 1]: Check [where] → Fix: [how]
- [Cause 2]: Check [where] → Fix: [how]

### Escalate if
- Not resolved in 15 minutes
- Data loss risk
- > N users affected
```

---

## Output Files

```
output/
  infrastructure/
    cloudwatch-dashboard.json    ← CloudWatch dashboard definition
    alerts.tf                    ← CloudWatch alarms as Terraform
  docs/
    SLO-[service].md             ← SLO definitions + error budgets
    alert-runbook-[name].md      ← Alert response runbooks
  code/
    utils/logger.js              ← Structured logger
    utils/metrics.js             ← Prometheus metrics
    tracing.js                   ← OpenTelemetry setup
    middleware/requestLogger.js  ← Request correlation middleware
```

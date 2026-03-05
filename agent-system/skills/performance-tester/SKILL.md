---
name: "performance-tester"
description: "Use when load testing APIs or UIs, benchmarking performance, profiling bottlenecks, setting performance budgets, or validating SLAs. Triggers: \"load test\", \"performance test\", \"benchmark\", \"stress test\", \"latency\", \"throughput\", \"p95\", \"performance budget\", \"slow API\", \"profiling\", or when preparing for production launch or traffic spikes."
---


# Performance Tester Skill

Design and run performance tests: load testing, stress testing, benchmarking, and profiling. Produces quantitative evidence for SLA sign-off.

---

## Performance Test Types

```
Load Test    → Normal expected load. Does it meet SLA?
Stress Test  → 2-5x normal load. Where does it break?
Spike Test   → Sudden traffic burst. Does it recover?
Soak Test    → Sustained load over hours. Memory leaks?
Benchmark    → Measure a single operation's performance floor
```

---

## API Load Testing — k6

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const loginDuration = new Trend('login_duration', true);
const successCount = new Counter('success_count');

// Test scenarios
export const options = {
  scenarios: {
    // Ramp up: simulate realistic traffic growth
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp to 50 users
        { duration: '5m', target: 50 },   // Hold at 50
        { duration: '2m', target: 100 },  // Ramp to 100
        { duration: '5m', target: 100 },  // Hold at 100
        { duration: '2m', target: 0 },    // Ramp down
      ],
    },
    // Stress: push beyond normal
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 500 },  // Stress
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      startTime: '18m', // Run after ramp_up
    },
  },
  // SLA thresholds — test FAILS if these aren't met
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms
    http_req_failed: ['rate<0.01'],                   // < 1% errors
    error_rate: ['rate<0.05'],
    login_duration: ['p(95)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Simulated user journey
export default function () {
  // 1. List endpoint
  const listRes = http.get(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });
  check(listRes, {
    'list: status 200': (r) => r.status === 200,
    'list: has data': (r) => r.json('data') !== undefined,
    'list: < 200ms': (r) => r.timings.duration < 200,
  });
  errorRate.add(listRes.status !== 200);

  sleep(1);

  // 2. Login endpoint (track custom metric)
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'test@example.com', password: 'testpass123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginDuration.add(Date.now() - loginStart);
  
  check(loginRes, {
    'login: status 200': (r) => r.status === 200,
    'login: has token': (r) => r.json('data.token') !== undefined,
  });

  if (loginRes.status === 200) successCount.add(1);

  sleep(2);
}

// Summary report
export function handleSummary(data) {
  return {
    'output/tests/performance/load-test-report.json': JSON.stringify(data, null, 2),
    stdout: generateTextReport(data),
  };
}

function generateTextReport(data) {
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const p99 = data.metrics.http_req_duration.values['p(99)'];
  const errorRate = data.metrics.http_req_failed.values.rate;
  
  return `
=== LOAD TEST RESULTS ===
p95 latency:  ${p95.toFixed(0)}ms  (SLA: < 500ms) ${p95 < 500 ? '✅' : '❌'}
p99 latency:  ${p99.toFixed(0)}ms  (SLA: < 1000ms) ${p99 < 1000 ? '✅' : '❌'}
Error rate:   ${(errorRate * 100).toFixed(2)}%  (SLA: < 1%) ${errorRate < 0.01 ? '✅' : '❌'}
Total reqs:   ${data.metrics.http_reqs.values.count}
========================
  `;
}
```

---

## Frontend Performance — Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse Performance

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Audit with Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            https://staging.yourapp.com
            https://staging.yourapp.com/dashboard
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

```json
// lighthouse-budget.json — performance budgets
{
  "budgets": [
    {
      "path": "/*",
      "timings": [
        { "metric": "first-contentful-paint", "budget": 1500 },
        { "metric": "largest-contentful-paint", "budget": 2500 },
        { "metric": "total-blocking-time", "budget": 200 },
        { "metric": "cumulative-layout-shift", "budget": 0.1 },
        { "metric": "interactive", "budget": 3500 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 300 },
        { "resourceType": "image", "budget": 500 },
        { "resourceType": "total", "budget": 1000 }
      ]
    }
  ]
}
```

---

## Database Query Profiling

```javascript
// utils/query-profiler.js — use in development to find slow queries
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: (sql, timing) => {
    if (timing > 100) {  // Log queries slower than 100ms
      console.warn(`🐌 SLOW QUERY (${timing}ms): ${sql.slice(0, 200)}`);
    }
  },
  benchmark: true,
});

// PostgreSQL EXPLAIN ANALYZE
async function explainQuery(queryFn) {
  const [results] = await sequelize.query(
    `EXPLAIN ANALYZE ${queryFn.toString()}`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  console.table(results);
}

// Find N+1 queries — count DB calls per request
let queryCount = 0;
sequelize.addHook('beforeQuery', () => queryCount++);
// After request: if queryCount > 10, likely N+1 issue
```

---

## Performance Test Report Template

```markdown
# Performance Test Report

Date: [date]
Environment: staging / production
Test type: Load / Stress / Spike / Soak
Duration: [X minutes]
Peak VUs: [N concurrent users]

## Results vs SLA

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| p50 latency | < 100ms | 87ms | ✅ |
| p95 latency | < 500ms | 342ms | ✅ |
| p99 latency | < 1000ms | 890ms | ✅ |
| Error rate | < 1% | 0.3% | ✅ |
| Throughput | > 100 req/s | 147 req/s | ✅ |
| LCP | < 2.5s | 1.8s | ✅ |

## Bottlenecks Found

1. [Endpoint] — [latency] — [root cause] — [fix]
2. [Query] — [timing] — [missing index / N+1] — [fix]

## Recommendations

- [ ] [Action]: [expected improvement]
- [ ] [Action]: [expected improvement]

## Verdict

✅ Ready for production traffic  
OR  
❌ Fix [X] before production: [specific blocking issues]
```

---

## Output Files

```
output/tests/performance/
  load-test.js              ← k6 test script
  load-test-report.json     ← raw results
  performance-report.md     ← human-readable report
  lighthouse-report.html    ← frontend audit
```

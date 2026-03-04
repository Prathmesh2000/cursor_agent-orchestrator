---
name: distributed-tracing-design
description: Use when designing or implementing observability for distributed systems. Triggers: "distributed tracing", "OpenTelemetry", "Jaeger", "Zipkin", "trace", "span", "correlation ID", "request tracing", "cross-service tracing", "service mesh observability", "why is this slow in production", or when debugging issues that span multiple services. Essential for any microservice system.
---

# Distributed Tracing Design Skill

Design and implement end-to-end distributed tracing for microservice systems: OpenTelemetry instrumentation, trace propagation, correlation IDs, and actionable dashboards.

---

## Why Distributed Tracing is Non-Negotiable for Microservices

```
In a monolith: grep logs, add console.log, read stack trace → done
In microservices:
  Request enters API Gateway →
    calls User Service →
      calls Auth Service →
    calls Order Service →
      calls Payment Service →
        calls Stripe →
      emits event →
        Email Service processes it

Without tracing: "The order failed" — which service? which call? what latency?
With tracing: Full waterfall in 30 seconds.
```

---

## OpenTelemetry Setup (Node.js)

```typescript
// src/instrumentation.ts — MUST be loaded before everything else
// Load: node --require ./dist/instrumentation.js dist/server.js

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]:    process.env.SERVICE_NAME ?? 'unknown-service',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION ?? '0.0.0',
    'deployment.environment': process.env.NODE_ENV ?? 'development',
  }),

  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4318/v1/traces',
  }),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4318/v1/metrics',
    }),
    exportIntervalMillis: 30_000,
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => sdk.shutdown());
```

---

## Correlation ID Middleware

```typescript
// middleware/correlationId.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { trace, context, propagation } from '@opentelemetry/api';

export function correlationId(req: Request, res: Response, next: NextFunction) {
  // 1. Extract incoming trace context (from upstream service)
  const extractedContext = propagation.extract(context.active(), req.headers);

  // 2. Get or generate correlation ID
  const correlationId = req.headers['x-correlation-id'] as string ?? uuid();
  const requestId     = req.headers['x-request-id'] as string ?? uuid();

  // 3. Attach to request
  (req as any).correlationId = correlationId;
  (req as any).requestId = requestId;

  // 4. Add to current span attributes
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute('correlation.id', correlationId);
    span.setAttribute('request.id', requestId);
  }

  // 5. Propagate downstream
  res.set('x-correlation-id', correlationId);
  res.set('x-request-id', requestId);

  next();
}
```

---

## Manual Span Creation (for business operations)

```typescript
// Use for complex operations that need custom tracing
import { trace, SpanStatusCode, context } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service', '1.0.0');

async function processOrder(orderId: string) {
  return tracer.startActiveSpan('processOrder', async (span) => {
    span.setAttribute('order.id', orderId);

    try {
      // Child span for DB operation
      const order = await tracer.startActiveSpan('db.fetchOrder', async (dbSpan) => {
        dbSpan.setAttribute('db.operation', 'SELECT');
        dbSpan.setAttribute('db.table', 'orders');
        try {
          return await Order.findByPk(orderId);
        } finally {
          dbSpan.end();
        }
      });

      if (!order) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Order not found' });
        span.setAttribute('error', true);
        throw new AppError('Order not found', 404);
      }

      span.setAttribute('order.status', order.status);
      span.setAttribute('order.amount', order.totalAmount);

      // Child span for payment
      await tracer.startActiveSpan('payment.charge', async (paySpan) => {
        paySpan.setAttribute('payment.method', order.paymentMethod);
        try {
          await paymentService.charge(order);
        } catch (err: any) {
          paySpan.recordException(err);
          paySpan.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
          throw err;
        } finally {
          paySpan.end();
        }
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return order;
    } catch (err: any) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

---

## Trace Propagation Between Services

```typescript
// clients/OrderServiceClient.ts — propagate trace context to downstream services
import axios from 'axios';
import { context, propagation } from '@opentelemetry/api';

class OrderServiceClient {
  async createOrder(data: CreateOrderData) {
    // Inject current trace context into outgoing HTTP headers
    const headers: Record<string, string> = {};
    propagation.inject(context.active(), headers);

    const response = await axios.post(`${env.ORDER_SERVICE_URL}/orders`, data, {
      headers: {
        ...headers,
        'x-correlation-id': (req as any).correlationId,  // pass through
      },
    });
    return response.data;
  }
}
```

---

## Structured Logging with Trace Context

```typescript
// config/logger.ts
import pino from 'pino';
import { trace, context } from '@opentelemetry/api';

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// Logger that automatically injects trace context
export const logger = {
  info: (obj: object | string, msg?: string) => {
    const span = trace.getActiveSpan();
    const spanContext = span?.spanContext();
    baseLogger.info({
      ...(typeof obj === 'object' ? obj : { msg: obj }),
      ...(spanContext ? {
        traceId: spanContext.traceId,
        spanId:  spanContext.spanId,
      } : {}),
      service: process.env.SERVICE_NAME,
    }, msg);
  },
  error: (err: Error | object, msg?: string) => {
    const span = trace.getActiveSpan();
    const spanContext = span?.spanContext();
    baseLogger.error({
      ...(err instanceof Error ? { err: { message: err.message, stack: err.stack } } : err),
      ...(spanContext ? { traceId: spanContext.traceId } : {}),
    }, msg);
  },
};
```

---

## Collector Config (OpenTelemetry Collector)

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http: { endpoint: 0.0.0.0:4318 }
      grpc: { endpoint: 0.0.0.0:4317 }

processors:
  batch:
    timeout: 5s
    send_batch_size: 512
  memory_limiter:
    limit_mib: 256

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls: { insecure: true }
  prometheus:
    endpoint: 0.0.0.0:8889
  logging:
    verbosity: normal

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [jaeger, logging]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
```

---

## SLI/SLO Definitions (per service)

```yaml
# slos/[service-name]-slos.yaml
service: order-service

slos:
  - name: api-availability
    description: Order API success rate
    sli:
      metric: http_server_requests_total
      filter: 'service="order-service",status!~"5.."'
      numerator: requests with 2xx/3xx/4xx status
      denominator: all requests
    target: 99.9%      # 43.8 minutes downtime/month
    window: 30d

  - name: api-latency
    description: Order API p95 latency
    sli:
      metric: http_server_duration_milliseconds
      percentile: 95
    target: < 500ms
    window: 30d

  - name: order-processing-success
    description: Orders successfully processed end-to-end
    sli:
      metric: order_processing_total
      filter: 'outcome="success"'
    target: 99.5%
    window: 30d

error_budget:
  - slo: api-availability
    remaining: computed from 1 - target
    burn_rate_alert: 5x for 1h page, 2x for 6h ticket
```

---

## Dashboards

```
Required Grafana dashboards per service:
  1. Service Overview
     - Request rate (rpm)
     - Error rate (%)
     - p50/p95/p99 latency
     - Active instances
     - Uptime

  2. Dependency Map
     - Calls made to each downstream service
     - Error rate per dependency
     - Latency per dependency

  3. Business Metrics
     - Service-specific KPIs (orders/min, payments/min, etc.)
     - Error categories by type
```

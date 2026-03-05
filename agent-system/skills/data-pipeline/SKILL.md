---
name: "data-pipeline"
description: "Use when designing or implementing data pipelines, ETL processes, data transformations, event streaming, analytics ingestion, data warehouse loading, or batch processing. Triggers: \"data pipeline\", \"ETL\", \"ELT\", \"data transformation\", \"data ingestion\", \"Kafka\", \"streaming\", \"batch processing\", \"data warehouse\", \"analytics pipeline\", \"SQS pipeline\", or when data needs to move and transform between systems."
---


# Data Pipeline Skill

Design and implement reliable data pipelines: ETL/ELT, event streaming, batch processing, and analytics ingestion. Pipelines must be observable, restartable, and idempotent.

---

## Pipeline Architecture Patterns

```
ETL (Extract → Transform → Load):
  Source → Pull data → Transform in memory → Load to destination
  Best for: Small-medium datasets, complex transformations

ELT (Extract → Load → Transform):
  Source → Load raw → Transform in warehouse (SQL/dbt)
  Best for: Large datasets, flexible analytics, data warehouse targets

Event Streaming:
  Source → Kafka/SQS → Consumers → Destinations
  Best for: Real-time, high volume, multiple consumers

Batch Processing:
  Scheduled trigger → Process chunk → Checkpoint → Next chunk
  Best for: Nightly reports, large historical backfills
```

---

## Core Pipeline Principles

```
1. IDEMPOTENT: Running twice produces same result (no duplicates)
2. RESTARTABLE: Can resume from checkpoint after failure
3. OBSERVABLE: Metrics on records processed, errors, lag
4. VALIDATED: Reject bad data explicitly, don't silently corrupt
5. SCHEMA VERSIONED: Handle source schema changes gracefully
```

---

## SQS-Based Event Pipeline (Node.js)

```javascript
// pipelines/userEventsPipeline.js
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand,
        DeleteMessageBatchCommand } = require('@aws-sdk/client-sqs');
const logger = require('../utils/logger');
const { dbQueryDuration } = require('../utils/metrics');

class SQSPipeline {
  constructor(config) {
    this.sqs = new SQSClient({ region: config.region });
    this.queueUrl = config.queueUrl;
    this.batchSize = config.batchSize || 10;       // SQS max = 10
    this.visibilityTimeout = config.visibilityTimeout || 30;
    this.running = false;
  }

  async start() {
    this.running = true;
    logger.info('Pipeline started', { queue: this.queueUrl });

    while (this.running) {
      await this._processBatch();
    }
  }

  async _processBatch() {
    const response = await this.sqs.send(new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: this.batchSize,
      WaitTimeSeconds: 20,         // Long polling — reduce empty calls
      VisibilityTimeout: this.visibilityTimeout,
      AttributeNames: ['ApproximateReceiveCount'],
    }));

    if (!response.Messages?.length) return;

    const results = await Promise.allSettled(
      response.Messages.map(msg => this._processMessage(msg))
    );

    // Only delete successfully processed messages
    const toDelete = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        toDelete.push({
          Id: response.Messages[i].MessageId,
          ReceiptHandle: response.Messages[i].ReceiptHandle,
        });
      } else {
        logger.error('Message processing failed', {
          messageId: response.Messages[i].MessageId,
          error: result.reason?.message,
          receiveCount: response.Messages[i].Attributes?.ApproximateReceiveCount,
        });
      }
    });

    if (toDelete.length) {
      await this.sqs.send(new DeleteMessageBatchCommand({
        QueueUrl: this.queueUrl,
        Entries: toDelete,
      }));
    }

    logger.info('Batch processed', {
      total: response.Messages.length,
      success: toDelete.length,
      failed: response.Messages.length - toDelete.length,
    });
  }

  async _processMessage(message) {
    const body = JSON.parse(message.Body);
    const { eventType, data } = body;

    // Route by event type
    const handler = this.handlers[eventType];
    if (!handler) {
      logger.warn('No handler for event type', { eventType });
      return; // Ack and discard unknown events
    }

    await handler(data, message);
  }

  stop() { this.running = false; }
}

// Usage
const pipeline = new SQSPipeline({ queueUrl: process.env.EVENT_QUEUE_URL, region: 'us-east-1' });
pipeline.handlers = {
  'user.created': async (data) => {
    await db('analytics_users').insert({
      user_id: data.userId,
      email: data.email,
      created_at: data.createdAt,
      // Idempotent: on conflict do nothing
    }).onConflict('user_id').ignore();
  },
  'order.completed': async (data) => {
    await db('analytics_revenue').insert({
      order_id: data.orderId,
      user_id: data.userId,
      amount: data.amount,
      completed_at: data.completedAt,
    }).onConflict('order_id').ignore();
  },
};
pipeline.start();
```

---

## Batch ETL Pipeline (with checkpointing)

```javascript
// pipelines/userBackfill.js — restartable batch pipeline
class BatchPipeline {
  constructor(config) {
    this.batchSize = config.batchSize || 500;
    this.name = config.name;
  }

  async run() {
    // Load checkpoint (where we left off)
    const checkpoint = await this._loadCheckpoint();
    let cursor = checkpoint?.lastProcessedId || null;
    let totalProcessed = 0;

    logger.info('Batch pipeline starting', { name: this.name, resumingFrom: cursor });

    while (true) {
      // Fetch next batch after cursor
      const records = await db('users')
        .where('id', '>', cursor || '00000000-0000-0000-0000-000000000000')
        .orderBy('id')
        .limit(this.batchSize);

      if (!records.length) break;

      await this._processBatch(records);

      cursor = records[records.length - 1].id;
      totalProcessed += records.length;

      // Save checkpoint after each successful batch
      await this._saveCheckpoint({ lastProcessedId: cursor, processedAt: new Date() });

      logger.info('Batch progress', { processed: totalProcessed, lastId: cursor });

      // Small delay to avoid overwhelming DB
      await sleep(100);
    }

    await this._clearCheckpoint();
    logger.info('Batch pipeline complete', { totalProcessed });
  }

  async _processBatch(records) {
    // Transform
    const transformed = records.map(r => ({
      user_id: r.id,
      email: r.email,
      name: r.name,
      created_month: r.created_at.toISOString().slice(0, 7),
      is_active: r.is_active,
      synced_at: new Date(),
    }));

    // Load — idempotent upsert
    await db('warehouse_users')
      .insert(transformed)
      .onConflict('user_id')
      .merge(['email', 'name', 'is_active', 'synced_at']);
  }

  async _loadCheckpoint() {
    return db('pipeline_checkpoints').where({ name: this.name }).first();
  }

  async _saveCheckpoint(data) {
    await db('pipeline_checkpoints')
      .insert({ name: this.name, ...data })
      .onConflict('name').merge();
  }

  async _clearCheckpoint() {
    await db('pipeline_checkpoints').where({ name: this.name }).delete();
  }
}
```

---

## Data Validation

```javascript
// utils/pipelineValidator.js
const Joi = require('joi');

const userEventSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  name: Joi.string().min(1).max(200).required(),
  createdAt: Joi.string().isoDate().required(),
});

function validateRecord(schema, record, context = {}) {
  const { error, value } = schema.validate(record, { abortEarly: false });

  if (error) {
    logger.warn('Pipeline record failed validation', {
      errors: error.details.map(d => d.message),
      record: sanitize(record), // remove PII for logging
      ...context,
    });

    // Send to dead letter queue for manual review
    await sendToDLQ(record, error.details);
    return null;  // null = skip this record
  }

  return value;
}
```

---

## Pipeline Monitoring

```javascript
// Track key pipeline metrics
const pipelineMetrics = {
  recordsProcessed: new Counter({ name: 'pipeline_records_total', labelNames: ['pipeline', 'status'] }),
  processingDuration: new Histogram({ name: 'pipeline_duration_seconds', labelNames: ['pipeline'] }),
  queueDepth: new Gauge({ name: 'pipeline_queue_depth', labelNames: ['queue'] }),
  lastSuccessTime: new Gauge({ name: 'pipeline_last_success_timestamp', labelNames: ['pipeline'] }),
};

// Alert thresholds:
// - Queue depth > 10000 for 5 min → pipeline not keeping up
// - No records processed in 10 min → pipeline stalled
// - Error rate > 5% → data quality issue
```

---

## Dead Letter Queue (DLQ) Pattern

```javascript
// Failed messages go to DLQ for manual inspection + replay
// Infrastructure: every SQS queue has a DLQ configured

// Replay failed messages from DLQ after fixing the bug
async function replayDLQ(dlqUrl, targetQueueUrl, limit = 100) {
  let replayed = 0;
  while (replayed < limit) {
    const response = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: dlqUrl, MaxNumberOfMessages: 10,
    }));
    if (!response.Messages?.length) break;

    // Send to main queue
    await sqs.send(new SendMessageBatchCommand({
      QueueUrl: targetQueueUrl,
      Entries: response.Messages.map(m => ({ Id: m.MessageId, MessageBody: m.Body })),
    }));

    // Delete from DLQ
    await sqs.send(new DeleteMessageBatchCommand({
      QueueUrl: dlqUrl,
      Entries: response.Messages.map(m => ({ Id: m.MessageId, ReceiptHandle: m.ReceiptHandle })),
    }));

    replayed += response.Messages.length;
  }
  logger.info('DLQ replay complete', { replayed });
}
```

---

## Output Files

```
output/code/
  pipelines/[name]Pipeline.js      ← Pipeline implementation
  pipelines/validators/[name].js   ← Schema validators
  pipelines/handlers/[event].js    ← Event handlers
output/docs/
  PIPELINE-[name]-design.md        ← Architecture + data flow diagram
```

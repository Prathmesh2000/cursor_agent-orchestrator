---
name: token-analyzer
description: Use when analyzing, estimating, or optimizing token usage for LLM API calls. Triggers: "token count", "token usage", "cost estimate", "context window", "token limit", "prompt too long", "optimize tokens", "reduce API cost", "context management", or when a prompt/conversation exceeds model limits.
---

# Token Analyzer Skill

Analyze, estimate, and optimize token usage across LLM API calls. Minimize cost, stay within context windows, and maintain quality.

---

## Token Estimation Rules (Approximate)

```
English text:     ~1 token per 4 characters  (~0.75 tokens/word)
Code:             ~1 token per 3-4 characters (whitespace and symbols cost more)
JSON:             ~1 token per 3 characters   (keys, quotes, braces add up)
Whitespace:       counts — blank lines and indentation cost tokens
Non-English:      1–4 tokens per character (CJK, Arabic can be expensive)

Quick estimates:
  100 words ≈ 130 tokens
  1 page A4 ≈ 500 tokens
  1000 lines of code ≈ 1500–2000 tokens
  Full PDF (10 pages) ≈ 5000 tokens
```

---

## Model Context Windows & Pricing (2025)

| Model | Context Window | Input $/1M | Output $/1M |
|---|---|---|---|
| Claude 3.5 Sonnet | 200K tokens | $3.00 | $15.00 |
| Claude 3 Haiku | 200K tokens | $0.25 | $1.25 |
| Claude 3 Opus | 200K tokens | $15.00 | $75.00 |
| GPT-4o | 128K tokens | $5.00 | $15.00 |
| GPT-4o mini | 128K tokens | $0.15 | $0.60 |
| GPT-4 Turbo | 128K tokens | $10.00 | $30.00 |
| Gemini 1.5 Pro | 1M tokens | $3.50 | $10.50 |
| Gemini 1.5 Flash | 1M tokens | $0.35 | $1.05 |
| Llama 3.1 405B | 128K tokens | ~$0.80 | ~$0.80 |

---

## Token Usage Analysis

### Analyze a Prompt/Conversation

```markdown
## Token Analysis Report

### Input Breakdown
| Section | Tokens | % of Total | Notes |
|---------|--------|------------|-------|
| System prompt | 450 | 22% | Can be cached |
| Conversation history | 1200 | 59% | Grows each turn |
| Current user message | 180 | 9% | — |
| Documents/context | 200 | 10% | — |
| **Total Input** | **2030** | 100% | |

### Output Estimate
Expected output: ~400 tokens

### Cost Per Call
Model: claude-3.5-sonnet
Input: 2030 × $3.00/1M = $0.0061
Output: 400 × $15.00/1M = $0.0060
Per call: ~$0.012

### At Scale
| Calls/day | Daily cost | Monthly cost |
|-----------|------------|--------------|
| 100 | $1.20 | $36 |
| 1,000 | $12.00 | $360 |
| 10,000 | $120.00 | $3,600 |

### Context Window Status
Used: 2,430 / 200,000 tokens (1.2%) ✅ Well within limit
Warning threshold: 160,000 tokens (80%)
```

---

## Optimization Strategies

### Strategy 1 — Prompt Compression

```
Before (verbose):
"Please carefully analyze the following text that I am going to provide 
to you and tell me what the main topics are that are being discussed 
in a detailed way"
→ 38 tokens

After (compressed):
"List the main topics in this text:"
→ 8 tokens (79% reduction, same intent)

Rules:
- Remove filler phrases: "please", "carefully", "I want you to"
- Remove redundancy: "tell me what X is" → "What is X?"
- Use imperative verbs: "List", "Summarize", "Extract", "Identify"
- Remove politeness: it costs tokens and doesn't improve output
```

### Strategy 2 — Conversation History Pruning

```javascript
// naive — grows forever (expensive)
const messages = [...allHistory, newMessage];

// sliding window — keep last N turns
const WINDOW = 10;
const messages = [
  systemMessage,
  ...history.slice(-WINDOW),
  newMessage
];

// smart — keep system + summary + recent
const messages = [
  systemMessage,
  { role: 'user', content: `Previous context summary: ${summary}` },
  ...history.slice(-4),   // keep only last 4 turns full fidelity
  newMessage
];
```

### Strategy 3 — Prompt Caching (Claude / GPT)

```javascript
// Claude — cache_control on stable prefix
{
  role: 'user',
  content: [
    {
      type: 'text',
      text: systemPrompt,              // large, stable — cache this
      cache_control: { type: 'ephemeral' }
    },
    {
      type: 'text',
      text: userQuestion               // dynamic — not cached
    }
  ]
}
// Cached tokens: 90% discount on re-reads
// Break-even: if same prompt used 2+ times
```

### Strategy 4 — Structured Output (reduces output tokens)

```
Instead of:
"The user's name is John, they are 28 years old, and their email is john@example.com"
→ 22 tokens

Use JSON mode:
{"name":"John","age":28,"email":"john@example.com"}
→ 14 tokens (36% reduction)
```

### Strategy 5 — Document Chunking

```
Problem: 50-page PDF = ~25,000 tokens = expensive per call

Solution — Retrieval Augmented Generation (RAG):
1. Chunk document into 500-token segments
2. Embed each chunk (one-time cost)
3. At query time: embed query → find top 3–5 relevant chunks
4. Send only relevant chunks to LLM (~1,500 tokens vs 25,000)
5. Cost reduction: ~94%

Chunking strategy:
- Chunk size: 300–600 tokens
- Overlap: 50–100 tokens (prevents cutting mid-context)
- Respect natural boundaries: paragraphs > sentences > characters
```

### Strategy 6 — Model Routing

```
Not every task needs the most expensive model:

Expensive tasks → Sonnet/GPT-4o
  - Complex reasoning, multi-step logic
  - Code generation with complex requirements
  - Creative writing with nuanced tone

Cheap tasks → Haiku/Flash/GPT-4o-mini
  - Classification (spam/not-spam)
  - Extraction (pull dates, names from text)
  - Simple Q&A with grounded context
  - Summarization of short content
  - Format conversion (JSON ↔ text)

Savings: 10x–40x cost reduction for routed tasks
```

---

## Context Window Management

### Warning Thresholds

```
Green  (< 50%):  Plenty of room, no action needed
Yellow (50–75%): Start pruning history, summarize old turns  
Orange (75–90%): Aggressive pruning, shorten system prompt
Red    (> 90%):  Risk of truncation — must act now
```

### Mid-Conversation Summarization

```javascript
// When history approaches 70% of context window:
const summaryPrompt = `
Summarize this conversation in 200 words max.
Capture: decisions made, key facts, user goals, current state.
Be dense — this replaces the full history.

Conversation:
${history.map(m => `${m.role}: ${m.content}`).join('\n')}
`;

const summary = await llm.complete(summaryPrompt);

// Replace history with summary
history = [
  { role: 'user', content: `[Conversation summary]: ${summary}` }
];
```

---

## Cost Optimization Report Template

```markdown
## Token Cost Optimization Report

### Current State
Daily calls: [N]
Avg tokens/call: [N] input + [N] output
Daily cost: $[X]
Monthly cost: $[X]

### Optimization Opportunities
| Strategy | Effort | Savings | Priority |
|----------|--------|---------|----------|
| Prompt compression | Low | 15–30% | High |
| History pruning | Medium | 40–60% | High |
| Prompt caching | Medium | 20–40% | Medium |
| Model routing | High | 50–80% | Medium |
| RAG for documents | High | 70–90% | Low (if no large docs) |

### Recommended Actions
1. [Action] → estimated savings: $[X]/month
2. [Action] → estimated savings: $[X]/month

### Projected After Optimization
Monthly cost: $[X] (was $[X]) — [X]% reduction
```

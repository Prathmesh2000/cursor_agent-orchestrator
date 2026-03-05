---
name: "ml-engineer"
description: "Use for machine learning tasks: model selection, training pipelines, evaluation, fine-tuning, RAG systems, embedding strategies, inference optimization, or MLOps. Triggers: \"ML\", \"model\", \"training\", \"fine-tune\", \"RAG\", \"embeddings\", \"inference\", \"LLM integration\", \"vector database\", \"classification\", \"prediction\", or any task involving machine learning in production."
---


# ML Engineer Skill

Design and implement production ML systems: model selection, training pipelines, RAG architectures, fine-tuning, evaluation frameworks, and inference optimization.

---

## ML Task Classification

First, identify what type of ML task this is:

```
INFERENCE ONLY       → Use existing model via API (fastest, cheapest to start)
RAG                  → Retrieval + generation for knowledge-grounded responses  
FINE-TUNING          → Adapt existing model to domain (when prompt engineering hits limits)
TRAINING FROM SCRATCH → Custom model on proprietary data (rare, expensive)
CLASSIC ML           → Tabular data, classification, regression (sklearn/XGBoost)
```

Decision guide:
```
Try prompt engineering first
  → Still poor quality? → Try RAG (add context)
  → Still poor quality? → Try fine-tuning (adapt behavior)
  → Need fully proprietary? → Train from scratch (large investment)
```

---

## RAG System Design

### Architecture

```
User Query
    │
    ▼
Query Embedding (same model as document embedding)
    │
    ▼
Vector Search (cosine similarity top-k)
    │
    ▼
Context Assembly (retrieved chunks + query)
    │
    ▼
LLM Generation (with retrieved context)
    │
    ▼
Response (grounded in source documents)
```

### Implementation Blueprint

```python
# 1. Document Processing Pipeline
class DocumentProcessor:
    def __init__(self, chunk_size=512, overlap=50):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def process(self, document: str) -> list[dict]:
        """Chunk, embed, and store document."""
        chunks = self._chunk(document)
        embeddings = self._embed(chunks)
        return [
            {"text": chunk, "embedding": emb, "metadata": {...}}
            for chunk, emb in zip(chunks, embeddings)
        ]

    def _chunk(self, text: str) -> list[str]:
        # Respect sentence/paragraph boundaries
        sentences = text.split('. ')
        chunks, current = [], []
        current_len = 0
        for sent in sentences:
            if current_len + len(sent) > self.chunk_size and current:
                chunks.append('. '.join(current))
                # Keep overlap
                current = current[-2:] if len(current) > 2 else current
                current_len = sum(len(s) for s in current)
            current.append(sent)
            current_len += len(sent)
        if current:
            chunks.append('. '.join(current))
        return chunks

    def _embed(self, texts: list[str]) -> list[list[float]]:
        # Use same embedding model for docs and queries
        response = openai.embeddings.create(
            model="text-embedding-3-small",
            input=texts
        )
        return [item.embedding for item in response.data]


# 2. Vector Store Integration
import chromadb  # or Pinecone, Weaviate, pgvector

client = chromadb.Client()
collection = client.create_collection("documents")

# Store
collection.add(
    embeddings=embeddings,
    documents=chunks,
    ids=[f"chunk_{i}" for i in range(len(chunks))],
    metadatas=[{"source": filename, "page": page}] * len(chunks)
)

# Retrieve
results = collection.query(
    query_embeddings=[query_embedding],
    n_results=5
)


# 3. RAG Query Pipeline
class RAGPipeline:
    def __init__(self, collection, llm_client, embed_model):
        self.collection = collection
        self.llm = llm_client
        self.embed_model = embed_model

    def query(self, question: str, top_k: int = 5) -> str:
        # Embed question
        q_embedding = self._embed(question)
        
        # Retrieve relevant chunks
        results = self.collection.query(
            query_embeddings=[q_embedding],
            n_results=top_k
        )
        
        # Build context
        context = "\n\n".join(results['documents'][0])
        
        # Generate with context
        response = self.llm.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system="""You are a helpful assistant. Answer questions using ONLY 
            the provided context. If the answer isn't in the context, say 
            "I don't have information about that in the provided documents." """,
            messages=[{
                "role": "user",
                "content": f"Context:\n{context}\n\nQuestion: {question}"
            }]
        )
        return response.content[0].text
```

---

## Fine-Tuning Decision Framework

```markdown
## Should You Fine-Tune?

Signs you need fine-tuning:
- Prompt engineering has plateaued (tried 10+ iterations)
- Need consistent output format that prompts can't enforce
- Domain-specific terminology model doesn't know
- Need significant latency/cost reduction (smaller fine-tuned model)
- Behavioral consistency across thousands of varied inputs

Signs you DON'T need fine-tuning:
- Haven't tried RAG yet (try RAG first — much cheaper)
- Haven't tried systematic prompt engineering
- Don't have 100+ high-quality labeled examples
- Task changes frequently (fine-tuned model needs retraining)
```

### Fine-Tuning Pipeline

```python
# Data preparation (most important step)
def prepare_training_data(examples: list[dict]) -> list[dict]:
    """
    examples = [{"input": "...", "output": "..."}]
    """
    formatted = []
    for ex in examples:
        formatted.append({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": ex["input"]},
                {"role": "assistant", "content": ex["output"]}
            ]
        })
    return formatted

# Data quality checklist:
# - Minimum 50 examples (100+ recommended, 1000+ for best results)
# - Diverse coverage of all input variations
# - Output quality consistent across all examples
# - No contradictions between examples
# - Reviewed by domain expert

# OpenAI fine-tuning
import openai

file = openai.files.create(
    file=open("training_data.jsonl", "rb"),
    purpose="fine-tune"
)

job = openai.fine_tuning.jobs.create(
    training_file=file.id,
    model="gpt-4o-mini",       # cheaper base model
    hyperparameters={
        "n_epochs": 3,          # start with 3, tune based on eval
    }
)

# Monitor
status = openai.fine_tuning.jobs.retrieve(job.id)
```

---

## Model Evaluation Framework

```python
class ModelEvaluator:
    """Production eval framework — run before every model change."""
    
    def __init__(self, test_cases: list[dict]):
        # test_cases: [{"input": str, "expected": str, "tags": list}]
        self.test_cases = test_cases

    def evaluate(self, model_fn: callable) -> dict:
        results = []
        for case in self.test_cases:
            output = model_fn(case["input"])
            results.append({
                "input": case["input"],
                "expected": case["expected"],
                "actual": output,
                "scores": {
                    "exact_match": self._exact_match(output, case["expected"]),
                    "semantic_similarity": self._semantic_sim(output, case["expected"]),
                    "format_valid": self._check_format(output),
                    "no_hallucination": self._check_grounding(output, case),
                },
                "tags": case["tags"]
            })
        
        return self._aggregate(results)

    def _semantic_sim(self, a: str, b: str) -> float:
        """Cosine similarity between embeddings."""
        emb_a = get_embedding(a)
        emb_b = get_embedding(b)
        return cosine_similarity(emb_a, emb_b)

    def _aggregate(self, results: list) -> dict:
        scores = [r["scores"] for r in results]
        return {
            "total_cases": len(results),
            "avg_semantic_similarity": mean(s["semantic_similarity"] for s in scores),
            "exact_match_rate": mean(s["exact_match"] for s in scores),
            "format_valid_rate": mean(s["format_valid"] for s in scores),
            "failures": [r for r in results if r["scores"]["semantic_similarity"] < 0.8],
            "by_tag": self._group_by_tag(results)
        }
```

### Evaluation Report

```markdown
## Model Evaluation Report

Model: [model name + version]
Date: [date]
Test cases: [N]

### Overall Scores
| Metric | Score | Threshold | Pass |
|--------|-------|-----------|------|
| Semantic similarity | 0.87 | 0.80 | ✅ |
| Format validity | 0.94 | 0.90 | ✅ |
| Exact match | 0.61 | 0.50 | ✅ |
| Hallucination rate | 0.03 | < 0.05 | ✅ |

### Failures (below threshold)
[List of failing cases with input/expected/actual]

### Recommendation
✅ Deploy — all metrics pass thresholds
❌ Hold — [X] metric below threshold, fix [Y] first
```

---

## Embedding Model Selection

| Model | Dimensions | Context | Speed | Cost | Best For |
|---|---|---|---|---|---|
| text-embedding-3-small | 1536 | 8K | Fast | $0.02/1M | General RAG, high volume |
| text-embedding-3-large | 3072 | 8K | Medium | $0.13/1M | High accuracy needed |
| text-embedding-ada-002 | 1536 | 8K | Fast | $0.10/1M | Legacy/OpenAI ecosystem |
| all-MiniLM-L6-v2 | 384 | 256 | Very Fast | Free (local) | On-premise, short text |
| nomic-embed-text | 768 | 8K | Fast | Free (local) | Open source, good quality |

---

## MLOps Checklist (Production)

```
Model Deployment:
- [ ] Model versioned and tagged
- [ ] Rollback plan documented
- [ ] A/B test infrastructure in place
- [ ] Canary deployment (5% → 25% → 100%)

Monitoring:
- [ ] Latency p50/p95/p99 tracked
- [ ] Token usage and cost tracked
- [ ] Output quality sampled and scored
- [ ] Error rate and type tracked
- [ ] Drift detection on input distribution

Data:
- [ ] Training data versioned
- [ ] Eval set never contaminated with train data
- [ ] PII scrubbed from training data
- [ ] Data lineage documented

Reliability:
- [ ] Retry logic with exponential backoff
- [ ] Fallback model configured (cheaper/faster)
- [ ] Rate limit handling
- [ ] Timeout configured (LLMs can hang)
- [ ] Circuit breaker for provider outages
```

---

## Output Files

```
output/
  ml/
    RAG-design-[name].md          ← RAG architecture spec
    eval-report-[model]-[date].md ← evaluation results
    finetune-dataset-[name].jsonl ← training data
    model-card-[name].md          ← model documentation
```

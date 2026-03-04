---
name: researcher
description: Use when doing technical research, technology evaluation, literature review, competitive analysis, feasibility studies, or RnD exploration. Triggers: "research", "compare options", "which technology should I use", "is this feasible", "what does the industry do", "state of the art", "RnD", "investigate", "evaluate", "benchmark", or before any major technical decision.
---

# Researcher Skill

Systematic research and technology evaluation. Produces structured findings, comparisons, and actionable recommendations backed by evidence.

---

## Research Process

### Step 1 — Define the Research Question

Before researching, clarify:
```
1. What decision does this research inform?
2. What is the time horizon? (prototype / production / long-term)
3. What are the hard constraints? (budget, team skill, existing stack)
4. What does "good enough" look like?
5. Who is the audience for the findings?
```

### Step 2 — Research Dimensions

For technology/solution research, always investigate:
```
- Maturity: Production-ready? How long in the market?
- Adoption: Who uses it? At what scale?
- Performance: Benchmarks, latency, throughput
- Cost: Licensing, hosting, API pricing
- Developer experience: Learning curve, docs quality, community
- Maintenance: Update frequency, security patch history
- Integration: Compatibility with existing stack
- Limitations: Known failure modes, anti-patterns, gotchas
- Future: Roadmap, company backing, community trajectory
```

---

## Research Report Template

```markdown
# Research Report: [Topic]
Date: [date]
Researcher: AI Research Agent
Decision needed by: [date/sprint]
Informs decision: [What choice this research is for]

---

## Executive Summary
[3-5 sentences: what was researched, key finding, recommendation]

## Research Question
[Precise question being answered]

## Methodology
[How research was conducted: docs reviewed, benchmarks run, examples tested]

---

## Findings

### Option A: [Name]
**What it is:** [1-sentence description]
**Maturity:** [Alpha / Beta / Production / Deprecated]
**Used by:** [Notable companies at scale]
**License:** [MIT / Apache / Commercial / etc]

Strengths:
- [Concrete strength with evidence]
- [Concrete strength with evidence]

Weaknesses:
- [Concrete weakness with evidence]
- [Concrete weakness with evidence]

Best for: [Specific use case where this wins]
Not good for: [Where it struggles]

---

### Option B: [Name]
[Same structure]

---

### Option C: [Name]
[Same structure]

---

## Comparison Matrix

| Criterion | Weight | Option A | Option B | Option C |
|-----------|--------|----------|----------|----------|
| Performance | 30% | 8/10 | 7/10 | 9/10 |
| Dev experience | 20% | 9/10 | 6/10 | 7/10 |
| Cost | 20% | 7/10 | 9/10 | 5/10 |
| Maturity | 15% | 9/10 | 8/10 | 6/10 |
| Integration fit | 15% | 8/10 | 7/10 | 8/10 |
| **Weighted Score** | | **8.2** | **7.4** | **7.2** |

## Recommendation
**Choose: Option A**

Rationale:
- [Primary reason]
- [Secondary reason]
- [Why alternatives were rejected]

Risks of this choice:
- [Risk 1 + mitigation]
- [Risk 2 + mitigation]

## Open Questions
- [ ] [Question that needs validation — assigned to who]
- [ ] [Question requiring prototype/spike]

## Sources
- [Source 1]: [URL or reference]
- [Source 2]: [URL or reference]
```

---

## Feasibility Study Template

```markdown
# Feasibility Study: [Feature/Approach]

## Hypothesis
[What we want to validate]

## Dimensions of Feasibility

### Technical Feasibility
- Can it be built with current stack? [Yes / Partial / No]
- Required new technologies: [list]
- Proof of concept needed: [Yes / No]
- Blockers: [list]

### Time Feasibility
- Estimated effort: [hours/weeks]
- Available capacity: [hours/weeks]
- Gap: [+ or -]

### Cost Feasibility
- Infrastructure cost: $[X]/month
- Development cost: [hours × rate]
- Ongoing maintenance: [hours/month]
- Budget available: $[X]
- Feasible: [Yes / Stretch / No]

### Risk Assessment
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| [Risk] | High/Med/Low | High/Med/Low | [Mitigation] |

## Verdict
✅ Feasible — proceed  
⚠️ Feasible with caveats — [conditions]  
❌ Not feasible — [reason + alternatives]

## Next Steps
1. [Action] — [owner] — [deadline]
```

---

## Technology Radar Categories

Use these to classify findings:

```
ADOPT   — Proven, use with confidence, recommended for new projects
TRIAL   — Worth pursuing, low risk, needs evaluation in your context
ASSESS  — Has potential but not ready — watch, experiment carefully
HOLD    — Proceed with caution, prefer alternatives for new work
AVOID   — Known problems, deprecated, or poor fit
```

---

## AI/ML Specific Research Areas

For AI/ML research specifically, also investigate:

```
Model Evaluation:
- Benchmark scores (MMLU, HumanEval, etc.)
- Task-specific evals for your use case
- Latency: time to first token + total time
- Cost per task (not just per token)
- Context window and limitations
- Fine-tuning availability and cost
- Rate limits at production scale

Data Research:
- Dataset quality and bias assessment
- Data licensing and usage rights
- Coverage of your target domain
- Class balance / representation issues
- Ground truth quality

Architecture Research:
- Paper reference (arXiv link)
- Open source implementations
- Production deployments at scale
- Known failure modes documented
- Inference optimization options (quantization, distillation)
```

---

## Research Output Files

```
output/docs/research/
  RESEARCH-[topic]-[date].md     ← full research report
  FEASIBILITY-[feature].md       ← feasibility study
  COMPARISON-[options].md        ← side-by-side matrix
  SPIKE-[experiment].md          ← findings from code spike/POC
```

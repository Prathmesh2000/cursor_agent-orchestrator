---
name: prompt-writer
description: Use when writing, optimizing, or auditing prompts for LLMs. Triggers: "write a prompt", "prompt engineering", "system prompt", "improve this prompt", "prompt for Claude/GPT/Gemini", "few-shot examples", "chain of thought", "prompt template", or any task involving instructing an AI model. Also use when AI output quality is poor and the cause is likely prompt design.
---

# Prompt Writer Skill

Design, optimize, and audit prompts for production LLM systems. Covers system prompts, user prompts, few-shot templates, chain-of-thought patterns, and multi-turn conversation design.

---

## Prompt Engineering Fundamentals

### The 6 Core Elements (use all that apply)

```
1. ROLE        — Who the model is / what persona it adopts
2. CONTEXT     — Background the model needs to do the task
3. TASK        — What exactly to do (be specific)
4. FORMAT      — How to structure the output
5. CONSTRAINTS — What NOT to do, limits, guardrails
6. EXAMPLES    — Few-shot demonstrations of good output
```

### Quality Checklist Before Shipping Any Prompt

- [ ] Is the role/persona clear?
- [ ] Does the model have all context it needs?
- [ ] Is the task unambiguous? (test with literal reading)
- [ ] Is the output format specified?
- [ ] Are edge cases and failure modes handled?
- [ ] Are constraints explicit (not implied)?
- [ ] Are examples representative of real inputs?
- [ ] Has it been tested with adversarial inputs?
- [ ] Is token usage efficient (no padding, no repetition)?

---

## System Prompt Template

```
You are [ROLE] — [1-sentence description of expertise and purpose].

## Context
[Background the model needs: domain, user, use case, any constraints it must know]

## Your Job
[Clear, specific task description. Use imperative verbs: "Analyze", "Generate", "Review"]

When the user provides [X], you must:
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Output Format
[Exact format — markdown, JSON, numbered list, table, prose. Show structure.]

## Rules
- ALWAYS: [non-negotiable behavior]
- NEVER: [explicit prohibitions]
- IF [edge case]: [how to handle it]
- IF unsure: [fallback behavior — ask, say so, or default action]

## Example
Input: [sample input]
Output: [ideal output — follow the format exactly]
```

---

## Prompt Patterns

### Zero-Shot
```
[Role + Context]
Task: [Clear instruction]
Output: [Format]
```

### Few-Shot (best for classification, extraction, transformation)
```
[Role + Context]

Here are examples of the task:

Input: [example 1 input]
Output: [example 1 output]

Input: [example 2 input]
Output: [example 2 output]

Input: [example 3 input]  ← varied — cover different cases
Output: [example 3 output]

Now complete:
Input: {{user_input}}
Output:
```

### Chain-of-Thought (best for reasoning, math, multi-step)
```
[Role + Context]

Think through this step by step before answering.

Problem: {{problem}}

Step 1 — [what to analyze first]:
Step 2 — [what to do next]:
Step 3 — [how to reach conclusion]:
Final Answer:
```

### ReAct Pattern (best for agentic tasks with tools)
```
You are [agent role] with access to these tools: [tool list]

For each task, follow this loop:
Thought: [Reason about what to do]
Action: [tool_name(params)]
Observation: [result of the action]
... (repeat until done)
Final Answer: [your conclusion]

Task: {{task}}
```

### Structured Output (JSON)
```
[Role + Context]

Respond ONLY with valid JSON. No explanation, no markdown, no preamble.

Schema:
{
  "field1": "string — description",
  "field2": "number — description",
  "field3": ["array of strings"]
}

If you cannot determine a value, use null.

Input: {{input}}
```

---

## Prompt Optimization Process

### Step 1 — Diagnose the Failure Mode

| Symptom | Likely Cause | Fix |
|---|---|---|
| Output ignores instructions | Instructions buried in long prompt | Move critical rules to top and bottom |
| Wrong format | Format not specified precisely | Add exact format with example |
| Hallucination | Model filling gaps with invention | Add "If unsure, say 'I don't know'" |
| Too verbose | No length constraint | Add "Respond in max X words/sentences" |
| Too brief | No depth instruction | Add "Explain your reasoning" |
| Ignores edge cases | Not specified | Add explicit IF/THEN rules |
| Inconsistent tone | No voice guidance | Add tone + example sentences |

### Step 2 — Rewrite Iteration

```markdown
## Prompt Audit

### Original Prompt
[paste]

### Problems Found
1. [Issue] — [Why it causes failure]
2. [Issue] — [Why it causes failure]

### Improved Prompt
[full rewrite]

### Changes Made
- Added role to establish expertise
- Moved output format to explicit section
- Added 3 edge case handling rules
- Added few-shot example covering the failing case
- Removed [X] — was padding with no effect

### Expected Improvement
[What should be different in outputs now]
```

### Step 3 — Test Matrix

Always test across:
```
- Typical input (happy path)
- Short/minimal input
- Long/complex input
- Ambiguous input
- Edge case input
- Adversarial/jailbreak attempt
- Off-topic input (what should it refuse or redirect?)
```

---

## Model-Specific Guidance

### Claude (Anthropic)
```
- Responds well to XML tags for structure: <context>, <task>, <rules>
- Prefers explicit "think step by step" for reasoning tasks
- Handles long system prompts well — use them fully
- Use "You must" and "Never" for hard constraints
- Add "Ask clarifying questions if the task is unclear" for agentic use
```

### GPT-4 / o1 (OpenAI)
```
- Responds well to numbered instruction lists
- Use JSON mode for structured output (set response_format)
- o1 models: don't add chain-of-thought instruction (it does it internally)
- Function calling > prompt parsing for tool use
- Shorter system prompts tend to work better than Claude
```

### Gemini (Google)
```
- Excels at structured document tasks
- Use explicit section headers in prompts
- Multimodal: describe image analysis tasks clearly
- Grounding instruction: "Base your answer only on the provided context"
```

---

## Multi-Turn Conversation Design

```
System prompt covers:
  - Persistent role and persona
  - Capabilities and limitations
  - How to handle when user goes off-topic
  - What information to remember / track

Turn structure:
  Turn 1: [Establish context, get initial info]
  Turn 2: [Dig deeper, ask follow-ups]
  Turn N: [Task execution based on gathered context]

State tracking in system prompt:
  "Track these across the conversation:
   - User's name (if provided)
   - Their goal
   - Decisions made so far
   Summarize state at the start of each response."
```

---

## Production Prompt File Format

Save all prompts as versioned files:

```markdown
# Prompt: [Name]
Version: 1.0
Model: claude-sonnet-4 | gpt-4o | gemini-1.5-pro
Use case: [What this prompt does]
Last tested: [date]
Pass rate: [X/X test cases]

## System Prompt
[full system prompt]

## User Prompt Template
[template with {{variables}} marked]

## Variables
- {{var1}}: [description, type, example]
- {{var2}}: [description, type, example]

## Test Cases
Input: [test 1]
Expected: [expected output]
Actual: [actual output on last test]
Pass: ✅ / ❌

## Changelog
v1.0 — Initial version
v1.1 — Added edge case for [X]
```

Save to: `output/prompts/[name]-v[version].md`

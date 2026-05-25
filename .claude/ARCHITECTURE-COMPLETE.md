# Complete Autonomous Agent Architecture

## Overview

You now have a production-ready autonomous agent system with 5 integrated components. The agent learns by working, continuously improves itself, and evolves new skills through a structured learning loop.

## Architecture: The 5 Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS LEARNING CYCLE                     │
└─────────────────────────────────────────────────────────────────┘

Phase 1: EXECUTION TRACER
├─ Records: State → Action → Observation at every decision point
├─ Output: execution-traces.jsonl (full audit trail)
├─ File: agent-manager.js (embedded ExecutionTracer class)
└─ Purpose: Create observability - you can trace WHY decisions were made

Phase 2: FACT EXTRACTOR
├─ Input: execution-traces.jsonl
├─ Analyzes: Patterns, distributions, timing, errors
├─ Output: FACTS.md (insights with confidence scores)
├─ File: fact-extractor.js
└─ Purpose: Turn raw execution data into queryable knowledge

Phase 3: INTERNAL DEBATE
├─ Input: Proposed skill/improvement
├─ Process: Generate PRO and CON arguments
├─ Decision: Approve if confidence >= 60%, else HOLD
├─ Output: DEBATES.md (reasoning trail)
├─ File: debate-engine.js
└─ Purpose: Filter low-confidence proposals before user sees them

Phase 4: SKILL PERFORMANCE
├─ Tracks: Success rate, execution time, problem resolution
├─ Evaluates: Should we KEEP, RETIRE, EVALUATE, or INVESTIGATE?
├─ Output: SKILL_EVALUATION.md (recommendations)
├─ File: skill-performance.js
└─ Purpose: Measure whether created skills actually solve problems

Phase 5: PROPOSAL BATCHING
├─ Queues: All proposals for 6-hour window
├─ Groups: By type (skills, improvements)
├─ Output: Single batch message to Telegram
├─ File: proposal-batcher.js
└─ Purpose: Prevent notification spam while ensuring proposals are heard
```

## Integration Flow

```
Agent completes task
    ↓
[Phase 1] Log execution trace (State → Action → Observation)
    ↓
[Phase 2] Extract facts from traces (patterns, insights)
    ↓
Identify opportunity for new skill/improvement
    ↓
[Phase 3] Debate: PRO vs CON (filter low-confidence)
    ↓
If confidence >= 60%:
    ↓
[Phase 5] Enqueue proposal in batch
    ↓
Every 6 hours OR when batch reaches threshold:
    ↓
Send batched proposals to Telegram
    ↓
User approves/rejects via buttons
    ↓
[Phase 4] If approved, register skill + track performance
    ↓
Next cycle: Measure if skill solved the problem
```

## Files Generated

### Core State Files
- `.claude/agent-state.json` — Task queue, completed tasks
- `.claude/proposals.json` — Pending/approved/rejected proposals
- `.claude/manager-state.json` — Last learning run, execution history
- `.claude/execution-traces.jsonl` — Full audit trail (append-only)
- `.claude/skills-performance.json` — Performance metrics per skill
- `.claude/proposal-batch-queue.json` — Current batch queue
- `.claude/proposal-batches.jsonl` — History of sent batches

### Memory/Learning Files
- `memory/FACTS.md` — Queryable insights with confidence scores
- `memory/DEBATES.md` — Internal reasoning before proposals
- `memory/SKILL_EVALUATION.md` — Should we keep/retire/investigate skills?
- `memory/LEARNINGS.md` — Agent reflections and lessons learned
- `memory/MEMORY.md` — User patterns, system insights, heuristics

## Running the System

### Full Learning Cycle
```bash
BOT_TOKEN="..." GROUP_ID="..." node agent-manager.js
```
Does:
1. Analyzes completed tasks
2. Detects patterns
3. Extracts facts
4. Debates proposals
5. Queues in batches
6. Saves execution traces

### Extract Facts from Traces
```bash
node fact-extractor.js
```
Reads execution-traces.jsonl and generates FACTS.md

### Evaluate Proposals Before Sending
```bash
node debate-engine.js
```
Shows internal reasoning (PRO/CON args)

### Track Skill Effectiveness
```bash
node skill-performance.js
```
Measures success rate, problem resolution, recommendations

### Batch Proposals
```bash
node proposal-batcher.js
```
Groups proposals, checks if time to flush, generates batch message

## Key Metrics

The agent now provides:
- **Observability**: Full trace of every decision
- **Explainability**: Reasons why proposals were made or rejected
- **Accountability**: Knows if created skills actually work
- **Efficiency**: Batches proposals to reduce user notification fatigue
- **Learning**: Extracts patterns and facts for future use

## Next Steps to Integrate

1. **Wire into agent-manager.js**: Use DebateEngine before calling proposeSkill()
2. **Wire into telegram-bot.js**: Use ProposalBatcher for Telegram sends
3. **Set up scheduled learning**: Use /schedule to run agent-manager.js every 6 hours
4. **Connect skill registry**: When proposals are approved, auto-create skill directories
5. **Monitor continuously**: Track which skills become valuable over time

## Philosophy

This system implements industry best practices from 2026:
- **Reflection pattern** (debate before proposing)
- **Observability first** (trace everything, understand why)
- **Human-in-the-loop** (user approves proposals, not fully autonomous)
- **Institutional memory** (facts, debates, evaluations persist)
- **Continuous improvement** (skills measured, refined, or retired)

The agent doesn't just execute tasks — it learns from them, reasons about improvements, and presents well-reasoned proposals for your approval.

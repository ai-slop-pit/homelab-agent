# Interface Contracts: CLI, Telegram, Monitors

## Overview
One unified brain, three input/output channels. Each has different constraints, permissions, and interaction patterns.

## CLI (Primary — Power User)
- **Full autonomy**: Execute non-destructive tasks without approval
- **Deep reasoning**: Access to full agent context, memory, skills
- **Active mode**: Drive the loop, submit requests, question the agent
- **Source of truth**: Long-running reasoning, complex decisions
- **Typical use**: "debug X", "implement feature Y", "what's the pattern here?"

## Telegram Bot (Secondary — Casual Use + Approvals)
- **Task submission**: "remind me...", "schedule...", "ask Claude to..."
- **Status queries**: "what's pending?", "is that done?"
- **Approval gates**: Wife approves/rejects automations (appliance control, scheduling)
- **Notifications**: Agent proactively notifies of discoveries, risks, suggestions
- **Architecture**: Write to `state/agent-state.json` queue; read results from same source
- **Security**: Sanitize inputs; require approvals for destructive/sensitive commands
- **Typical use**: Async task submission, low-friction queries, approval workflow

## Scheduled Monitors (Tertiary — Passive Intelligence)
- **Run on schedule**: cron/scheduler (e.g., every 15 min for health, every hour for analysis)
- **Poll state**: Logs, metrics, filesystem state
- **Detect anomalies**: Flag unhealthy states via Telegram or update state queue
- **Feed learnings**: Observations → `memory/MEMORY.md` for future context
- **Proactive reasoning**: Detect patterns the user hasn't asked about yet
- **Typical use**: Background health checks, opportunity spotting, autonomous learning

## Shared State
All three channels read/write to:
- **`memory/MEMORY.md`**: Persistent patterns, lessons, heuristics
- **`state/agent-state.json`**: Task queue, results, pending evolution
- **`.claude/setup-artifacts/`**: Configuration and service metadata

# Claude Home Assistant — CT 112

**One unified brain. Multiple interfaces. Autonomous execution.**

A sophisticated home automation agent running on LXC container 112 (Proxmox at 192.168.50.2) that operates as a single persistent intelligence with multiple interaction channels: CLI (primary), Telegram (secondary), and HTTP API (n8n integration).

> **Status**: Phase 1 complete ✅ Async task queue, approval workflows, autonomous execution. Ready for Phase 2 skill development.

## Quick Start

```bash
# See the agent running
./.claude/task-runner.sh run                    # Execute pending tasks once

# Submit a task via CLI
python3 ./.claude/agent-state-utils.py add-task cli user reminder "test" reminder-engine false normal

# Review pending approvals (Telegram tasks)
./.claude/approval-gate.sh list

# Approve and execute
./.claude/approval-gate.sh approve-index 1
./.claude/task-runner.sh run
```

## One Brain, Multiple Interfaces

```
┌─────────────────────────────────────────┐
│  UNIFIED AGENT BRAIN                    │
│  (.claude/agent-state.json)             │
└─────────────┬──────────────┬────────────┘
              │              │
         ┌────▼────┐    ┌────▼──────────┐
         │   CLI   │    │   Telegram   │
         │(Primary)│    │ (Secondary)  │
         └─────────┘    └──────────────┘
              │              │
              └──────┬───────┘
                     ▼
            Task Queue & State
                     │
                     ▼
            Autonomous Task Runner
```

## Architecture at a Glance

| Component | Purpose |
|-----------|---------|
| **Shared State** (`.claude/agent-state.json`) | Single source of truth: task queue, status, approvals |
| **Task Runner** (`./.claude/task-runner.sh`) | Autonomous loop: polls queue, executes tasks, updates state |
| **Approval Gates** (`./.claude/approval-gate.sh`) | Human-in-loop: review and approve pending tasks |
| **Telegram Bot** (`telegram-bot.js`) | Secondary interface: task submission, status queries, notifications |
| **HTTP API** (port 3000) | n8n integration: external workflow triggers |

## Interfaces

### CLI (Primary) — Full Power
```bash
# Direct task submission (no approval needed)
python3 ./.claude/agent-state-utils.py add-task cli user query "research topic" research false high

# Execute immediately
./.claude/task-runner.sh run
```

### Telegram (Secondary) — Approval Workflow
```
Wife: "remind me about laundry"
    ↓
Bot: Task queued, requires approval
    ↓
Owner reviews: ./.claude/approval-gate.sh list
    ↓
Owner approves: ./.claude/approval-gate.sh approve-index 1
    ↓
Task Runner: Executes and notifies
    ↓
Wife: Notification of completion
```

### HTTP API (n8n Integration)
```bash
curl -X POST http://localhost:3000/task \
  -H "Content-Type: application/json" \
  -d '{"task": "backup database", "taskType": "automation"}'

# Task queued, executes on next runner cycle
```

## Key Features

✅ **Unified State** — All interfaces read/write to shared `.claude/agent-state.json`
✅ **Async Execution** — Queue tasks and execute later, not blocking
✅ **Approval Workflow** — Non-owner tasks require approval for safety
✅ **Destructive Operation Detection** — Flags delete/destroy/reset tasks for review
✅ **Atomic Updates** — No corruption from concurrent writes
✅ **Full Audit Trail** — Logs all approvals, executions, errors
✅ **Skills Framework** — Extensible design for new capabilities

## Directory Structure

See **[docs/](docs/)** for detailed documentation:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Deep dive into design, data flow, decision rationale
- [docs/SETUP.md](docs/SETUP.md) — Installation, configuration, environment setup
- [docs/USAGE.md](docs/USAGE.md) — How to use each interface with examples
- [docs/SKILLS.md](docs/SKILLS.md) — Skill framework, implementing new skills
- [docs/API.md](docs/API.md) — HTTP API reference (n8n, external integrations)
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — Patterns, extending the agent, testing
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — Common issues, recovery procedures
- [PHASE1_COMPLETE.md](PHASE1_COMPLETE.md) — Phase 1 feature summary and usage guide

## Core Files

```
.claude/
  ├── agent-state.json              ⭐ Shared state (DO NOT DELETE)
  ├── agent-state-utils.py          State manipulation CLI
  ├── task-runner.sh                Autonomous execution engine
  ├── approval-gate.sh              Approval workflow manager
  └── skills/                       Skill implementations
      └── research/                 Deep web research (Phase 1)

telegram-bot.js                     Telegram interface
CLAUDE.md                           Project instructions
logs/                               Execution and approval logs
```

## Commands Quick Reference

**State Management**
```bash
python3 ./.claude/agent-state-utils.py add-task <source> <user> <type> <desc> <skill> [approval] [priority]
python3 ./.claude/agent-state-utils.py list-pending
python3 ./.claude/agent-state-utils.py approve <task-id> <user>
```

**Execution**
```bash
./.claude/task-runner.sh run          # Execute pending tasks once
./.claude/task-runner.sh loop 0       # Run continuously
```

**Approvals**
```bash
./.claude/approval-gate.sh list       # Show pending approvals
./.claude/approval-gate.sh approve-index 1
./.claude/approval-gate.sh watch      # Continuous monitoring
```

## Status

| Phase | Status | Features |
|-------|--------|----------|
| **Phase 1** | ✅ Complete | Async queue, approvals, multi-interface, autonomous execution |
| **Phase 2** | 📋 Planned | Reminder engine, home automation, schedule manager |
| **Phase 3** | 📋 Planned | Voice assistant, web dashboard, advanced autonomy |

## Home Lab

| Host | Role |
|------|------|
| 192.168.50.2 | Proxmox hypervisor |
| 192.168.50.112 | This container (CT 112) — Claude Agent |
| 192.168.50.153 | n8n automation server |

## Learn More

📖 **New to the redesign?** Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
🚀 **Ready to use it?** See [docs/USAGE.md](docs/USAGE.md)
🔧 **Want to extend it?** Check [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
❓ **Something broken?** Try [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

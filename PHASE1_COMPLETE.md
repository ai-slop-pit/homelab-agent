# Phase 1: One Brain, Multiple Interfaces — COMPLETE ✅

## Vision Realized
Claude Home Assistant now operates as a **single unified autonomous agent** with multiple interaction channels:
- **CLI (Primary)**: Full control, direct access, immediate execution
- **Telegram (Secondary)**: Task submission, approval workflow, mobile interface
- **HTTP API**: n8n integration, remote triggers
- **Autonomous Loop**: Task-runner polls and executes tasks asynchronously

## Architecture Built

```
┌──────────────────────────────────────────┐
│   ONE UNIFIED AGENT BRAIN                │
│   (Shared State: .claude/agent-state.json) │
└──────┬───────────────────┬───────────────┘
       │                   │
   ┌───▼──────┐        ┌───▼──────────┐
   │  CLI     │        │   Telegram   │
   │(Primary) │        │ (Secondary)  │
   └──────────┘        └──────────────┘
       │                   │
       └─────────┬─────────┘
               ▼
      .claude/agent-state.json
      (Task Queue + Status)
               │
          ┌────▼────────────┐
          │  Task Runner    │
          │  (Autonomous    │
          │   Execution)    │
          └─────────────────┘
               │
         ┌─────┴──────────────┐
         │                    │
     ┌───▼────┐          ┌───▼────┐
     │ Skills │          │Approval│
     │ Engine │          │ Gates  │
     └────────┘          └────────┘
```

## Components Implemented

### 1. **Shared Agent State** (`.claude/agent-state.json`)
- Single source of truth for all interfaces
- Atomic writes prevent corruption
- Tracks task lifecycle: pending → approved → executing → completed/failed
- Supports approval gates for safety
- **Location**: `.claude/agent-state.json`
- **Utils**: `./.claude/agent-state-utils.py` (CLI tool)

### 2. **Telegram Bot Refactor** (`telegram-bot.js`)
- **No longer executes directly** — queues tasks instead
- Detects destructive operations and marks for approval
- Non-owner tasks always require approval
- HTTP endpoints for task submission (n8n integration)
- Provides task status queries

### 3. **Autonomous Task Runner** (`.claude/task-runner.sh`)
- Polls `.claude/agent-state.json` for pending/approved tasks
- Executes tasks using appropriate skills
- Updates status, results, and errors atomically
- Supports multiple execution modes:
  - `task-runner.sh run` — Execute pending tasks once
  - `task-runner.sh loop [count]` — Run continuously
- Logs all operations to `logs/task-runner-YYYY-MM-DD.log`

### 4. **Approval Gates** (`.claude/approval-gate.sh`)
- Review pending approvals with task details
- Approve/reject tasks with confirmation
- Auto-approve safe, low-risk tasks
- Watch mode: continuously display pending approvals
- Logs approval decisions for audit trail

## How It Works: Task Lifecycle

### User Submission (Telegram)
```
Wife submits: "remind me about laundry"
         ↓
Telegram bot validates, detects it's non-destructive
         ↓
Adds to queue with approval_required=true
         ↓
Status: PENDING (awaiting approval)
```

### Owner Review & Approval (CLI)
```
User runs: ./.claude/approval-gate.sh list
         ↓
Sees: "1. 👤 [task-id] telegram | wife: remind me about laundry"
         ↓
User runs: ./.claude/approval-gate.sh approve [task-id]
         ↓
Status: APPROVED
```

### Autonomous Execution
```
Task-runner polls: ./.claude/task-runner.sh run
         ↓
Finds approved task
         ↓
Executes appropriate skill (reminder-engine, research, etc.)
         ↓
Updates status: EXECUTING → COMPLETED
         ↓
Notifies user via Telegram: "✅ Reminder set"
```

## Usage Patterns

### Pattern 1: CLI Power User (Full Autonomy)
```bash
# Direct CLI command
claude "what's the weather tomorrow?"

# Or submit via CLI to queue
python3 ./.claude/agent-state-utils.py add-task cli user query "weather forecast" research false high

# Task runs immediately on next runner cycle
```

### Pattern 2: Telegram Secondary (Wife/Casual Use)
```
Wife on Telegram: "please remind me to check the mail"

Owner sees notification, reviews:
  ./.claude/approval-gate.sh list
  ./.claude/approval-gate.sh approve [task-id]

Task executes automatically
```

### Pattern 3: n8n Automation (External Triggers)
```bash
# n8n workflow triggers:
curl -X POST http://localhost:3000/task \
  -H "Content-Type: application/json" \
  -d '{"task": "backup database", "taskType": "automation", "skill": "n8n-orchestrator"}'

# Task queued, no approval required (from system)
# Executes on next runner cycle
```

### Pattern 4: Scheduled/Continuous Execution
```bash
# Run task-runner in background loop
./.claude/task-runner.sh loop 0 &

# Or schedule via cron
# */5 * * * * cd /opt/claude-agent && ./.claude/task-runner.sh run
```

## Files & Commands

### Core Files
| File | Purpose |
|------|---------|
| `.claude/agent-state.json` | Shared state (task queue) |
| `.claude/agent-state-schema.md` | State schema documentation |
| `.claude/agent-state-utils.py` | CLI utilities for state management |
| `.claude/task-runner.sh` | Autonomous execution engine |
| `.claude/approval-gate.sh` | Approval workflow manager |
| `CLAUDE.md` | Updated project instructions |

### Command Reference

**State Management**
```bash
python3 ./.claude/agent-state-utils.py add-task <source> <user> <type> <desc> <skill> [approval] [priority]
python3 ./.claude/agent-state-utils.py list-pending
python3 ./.claude/agent-state-utils.py list-completed
python3 ./.claude/agent-state-utils.py get-task <task-id>
python3 ./.claude/agent-state-utils.py approve <task-id> <user>
python3 ./.claude/agent-state-utils.py reject <task-id> <user>
```

**Task Execution**
```bash
./.claude/task-runner.sh run              # Execute pending tasks once
./.claude/task-runner.sh loop 10          # Run 10 iterations
./.claude/task-runner.sh loop 0           # Run infinitely (with 5s polling)
```

**Approvals**
```bash
./.claude/approval-gate.sh list           # Show pending approvals
./.claude/approval-gate.sh show <task-id> # Show task details
./.claude/approval-gate.sh approve <id>   # Approve task (interactive)
./.claude/approval-gate.sh watch 5        # Continuous watch mode
```

## Integration Points

### Telegram Bot (`telegram-bot.js`)
- Listens for messages on configured group/DM
- Submits tasks to queue instead of executing directly
- Provides `/status`, `/tasks`, `/setup` commands
- HTTP endpoint `/task` for n8n triggers

### Task Runner
- Runs continuously or on-demand
- Executes skills in order of priority
- Updates shared state atomically
- Notifies Telegram on completion

### Approval Gate
- Manual review interface
- Supports confirmation prompts
- Auto-approve for trusted users
- Watch mode for continuous monitoring

## Next Steps (Phase 2-3)

Future skills to implement:
- **reminder-engine**: Full reminder scheduling and tracking
- **home-automation**: Proxmox, light control, appliance management
- **schedule-manager**: Cron-like recurring tasks
- **n8n-orchestrator**: Workflow triggering and monitoring

## Logs & Monitoring

All operations logged to:
- `logs/task-runner-YYYY-MM-DD.log` — Execution logs
- `logs/approvals-YYYY-MM-DD.log` — Approval decisions
- `logs/<date>.log` — General agent activity

## Testing

Verify the system is working:
```bash
# 1. Add a test task
python3 ./.claude/agent-state-utils.py add-task cli user reminder "test reminder" reminder-engine false normal

# 2. View pending tasks
./.claude/approval-gate.sh list

# 3. Execute tasks
./.claude/task-runner.sh run

# 4. Check completion
python3 ./.claude/agent-state-utils.py list-completed
```

---

**Status**: Phase 1 complete. Agent now operates as unified "one brain" with multiple interfaces. Ready for Phase 2 skill development.

**Last Updated**: 2026-05-24

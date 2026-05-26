# Architecture & Design

## Overview

Claude Home Assistant operates as a **unified autonomous agent** with a single persistent brain that can be accessed through multiple interfaces. All state is centralized in a shared JSON file, enabling multiple components to coordinate without tight coupling.

## System Design

### The One Brain

```
┌──────────────────────────────────────────────────────────┐
│               UNIFIED AGENT BRAIN                        │
│                                                          │
│  Persistent Context:                                    │
│  • Shared state (state/agent-state.json)              │
│  • Task queue (pending, approved, completed)            │
│  • Approval status and audit trail                      │
│  • Agent lifecycle state (idle, busy, sleeping)         │
└──────────────┬───────────────────┬──────────────────────┘
               │                   │
          ┌────▼────┐         ┌────▼──────────┐
          │   CLI   │         │   Telegram   │
          │ Primary │         │  Secondary   │
          │Interface│         │  Interface   │
          └─────────┘         └──────────────┘
               │                   │
               └─────────┬─────────┘
                         ▼
          state/agent-state.json
          (Single Source of Truth)
                         │
         ┌───────────────┼──────────────┐
         │               │              │
    ┌────▼────┐    ┌────▼────┐  ┌──────▼───┐
    │Task     │    │Approval │  │HTTP API  │
    │Runner   │    │Gates    │  │(n8n)    │
    │(Async   │    │(Review) │  │(Webhooks)│
    │Exec)    │    │         │  │         │
    └─────────┘    └─────────┘  └─────────┘
         │
    ┌────▼──────────────────┐
    │   Skills Engine       │
    │ (reminder, research,  │
    │  home-automation,     │
    │  schedule-manager)    │
    └──────────────────────┘
```

### Task Lifecycle

```
┌─────────┐
│ PENDING │  Task submitted (awaiting approval if required)
└────┬────┘
     │
     ├─ [approval_required=false]  ──→  ┌──────────┐
     │                                   │EXECUTING │
     │                                   └────┬─────┘
     │                                        │
     │  [approval_required=true]               ├─→ ┌──────────┐
     │        ↓                                │    │COMPLETED │
     │   ┌─────────────┐                      │    └──────────┘
     │   │Needs Review │                      │
     │   └─────┬───────┘                      │
     │         │                              │
     │   User approves                        │
     │   ./.claude/approval-gate.sh approve   │
     │         │                              │
     │         ▼                              │
     └────→ ┌──────────┐                      │
            │APPROVED  │ ─→ [next runner cycle]
            └──────────┘                      │
                                             │
                        [Error/Failure]      │
                               ↓             │
                            ┌─────────┐      │
                            │ FAILED  │←─────┘
                            └─────────┘
```

## Core Components

### 1. Shared Agent State

**File**: `state/agent-state.json`

The single source of truth for the entire system. All interfaces (CLI, Telegram, HTTP) read from and write to this file.

```json
{
  "version": "1.0",
  "agent_state": "idle|busy|sleeping|error",
  "last_sync": "2026-05-24T12:00:00Z",
  "pending_tasks": [
    {
      "id": "uuid",
      "source": "cli|telegram|n8n",
      "source_user": "user-name",
      "task_type": "reminder|automation|query|schedule",
      "task": "human-readable task description",
      "priority": "low|normal|high",
      "status": "pending|approved|executing|completed|failed",
      "skill": "skill-name",
      "approval_required": true|false,
      "approved_by": "user-name or null",
      "approved_at": "ISO timestamp or null",
      "result": "output or null",
      "error": "error message or null",
      "retry_count": 0,
      "notify_channels": ["telegram"],
      "created_at": "ISO timestamp",
      "updated_at": "ISO timestamp",
      "metadata": {}
    }
  ],
  "completed_tasks": [/* same structure, moved here when done */]
}
```

**Why JSON, not a database?**
- Simple: No database server to manage
- Portable: Backup is just a file copy
- Observable: Human-readable state
- Atomic: Temp file + rename = no corruption
- Sufficient: Home assistant doesn't need 100k tasks

**Safety Mechanisms**:
- Atomic writes via temporary file + `os.replace()`
- Always read fresh state before modifying (no cached state)
- Timestamp tracking prevents stale writes
- Completed tasks archive keeps file size reasonable

### 2. Task Runner (Autonomous Loop)

**File**: `./.claude/scripts/task-runner.sh`

Implements the autonomous execution engine. Polls the shared state, filters for executable tasks, invokes skills, and updates state.

**Execution Model**:
```bash
While tasks exist:
  1. Read state/agent-state.json
  2. Filter: status in (pending, approved) AND approval_required satisfied
  3. Sort by priority (high → normal → low)
  4. For each task:
     a. Mark status = executing
     b. Call execute_<skill>_skill()
     c. Update status = completed/failed
     d. Notify channels (Telegram, etc.)
  5. Update agent_state = idle
  6. Sleep 5s (if loop mode)
```

**Usage**:
```bash
./.claude/scripts/task-runner.sh run            # Execute once, exit
./.claude/scripts/task-runner.sh loop 10        # Run 10 iterations
./.claude/scripts/task-runner.sh loop 0         # Run forever (5s polling)
```

**Design Benefits**:
- ✅ Decoupled from interfaces (doesn't block Telegram)
- ✅ Can run continuously or on-demand
- ✅ Atomic state updates prevent corruption
- ✅ Skills are pluggable functions
- ✅ Full error handling and retry logic

### 3. Approval Gates

**File**: `./.claude/approval-gate.sh`

Implements the human-in-the-loop workflow. Allows reviewing, approving, and rejecting pending tasks before execution.

**Workflow**:
1. User submits task via Telegram
2. Bot marks task with `approval_required=true`
3. Owner reviews: `./.claude/approval-gate.sh list`
4. Owner approves: `./.claude/approval-gate.sh approve <task-id>`
5. Task moves to `approved` status
6. Task runner picks it up on next cycle
7. User notified of completion

**Why this design?**
- ✅ Safety: Non-owners can't cause damage
- ✅ Transparency: Full audit trail
- ✅ Control: Owner reviews before execution
- ✅ Flexibility: Can auto-approve low-risk tasks later

### 4. Telegram Bot

**File**: `telegram-bot.js`

Secondary interface for non-power users. No longer spawns Claude directly—instead queues tasks.

**Key Changes** (Phase 1 Redesign):
- ❌ **Old**: `spawnSync('claude')` — blocking execution
- ✅ **New**: Add to queue, return immediately

**Workflow**:
```
User message → Bot validates → Detects destructive? 
  ├─ Yes → approval_required=true
  └─ No → Checks if owner
      ├─ Owner → approval_required=false
      └─ Non-owner → approval_required=true
        → Add to queue → Reply "Task queued"
```

**HTTP Endpoints**:
- `POST /task` — Submit task from n8n
- `GET /task/:taskId` — Query task status
- `GET /tasks/pending` — List pending tasks
- `GET /status` — Agent status
- `GET /health` — Health check

### 5. Skills Engine

Extensible architecture for task execution. Each skill is a function that:
1. Takes task description as input
2. Executes domain-specific logic
3. Updates task state with result/error

**Skill Registration**:
```bash
# In task-runner.sh
execute_<skill-name>_skill() {
  local task_id="$1"
  local task_desc="$2"
  
  # Execute logic
  local result=$(...)
  
  # Update state
  python3 "$UTILS" update-status "$task_id" "completed" "$result"
}
```

**Current Skills**:
- `research` — Deep web research with Gemini

**Planned Skills**:
- `reminder-engine` — Schedule and track reminders
- `home-automation` — Light, temperature, appliance control
- `schedule-manager` — Cron-like recurring tasks
- `n8n-orchestrator` — Trigger external workflows

## Data Flow Examples

### Example 1: CLI Task (Owner)

```
User: ./.claude/agent-state-utils.py add-task cli user query "weather" research false high
  ↓
Adds to pending_tasks with approval_required=false
  ↓
Task runner polls: ./.claude/scripts/task-runner.sh run
  ↓
Finds task, status=pending, no approval needed
  ↓
Calls execute_research_skill()
  ↓
Executes research, gets result
  ↓
Updates task: status=completed, result="..."
  ↓
Task moved to completed_tasks
  ↓
Done ✅
```

### Example 2: Telegram Task (Non-Owner, Requires Approval)

```
Wife: "remind me about laundry"
  ↓
telegram-bot.js:
  - Validates user (wife)
  - Checks if owner (no)
  - Sets approval_required=true
  - Adds task to queue
  - Replies: "Task queued, requires approval"
  ↓
Owner: ./.claude/approval-gate.sh list
  ↓
Shows: "1. 👤 [task-id] telegram | wife: remind me about laundry"
  ↓
Owner: ./.claude/approval-gate.sh approve-index 1
  ↓
Task status → approved, approved_by=owner
  ↓
Task runner polls: ./.claude/scripts/task-runner.sh run
  ↓
Finds task, status=approved
  ↓
Calls execute_reminder_skill()
  ↓
Sets reminder, gets result
  ↓
Updates task: status=completed, result="Reminder scheduled"
  ↓
Notifies Telegram: "✅ Reminder set for laundry"
  ↓
Done ✅
```

### Example 3: n8n External Trigger (No Approval)

```
n8n workflow (192.168.50.153):
  POST http://localhost:3000/task
  { task: "backup database", taskType: "automation" }
  ↓
telegram-bot.js /task endpoint:
  - source=n8n, source_user=system
  - Sets approval_required=false
  - Adds task to queue
  - Returns: { taskId, status: "queued" }
  ↓
Task runner polls (continuous loop mode)
  ↓
Finds task, executes immediately
  ↓
Updates state, task complete
  ↓
n8n can query status: GET /task/:taskId
  ↓
Done ✅
```

## Design Decisions & Rationale

| Decision | Why | Trade-off |
|----------|-----|-----------|
| JSON file vs. Database | Simple, portable, no server | Not ideal for 100k+ tasks |
| Shared state vs. per-interface | Single source of truth | Need atomic writes |
| Async queue vs. direct execution | Non-blocking, approval possible | Slight latency (seconds) |
| Approval gates for non-owner | Safety for family members | Requires manual approval |
| Skill-based architecture | Extensible, domain-separated | More setup per skill |
| Atomic file updates (temp+mv) | Prevents corruption | Tiny overhead |

## Scalability & Limits

**Current design suitable for**:
- 10-100 tasks/day (home assistant workload)
- File size: ~1KB per task
- Monthly purge: Keep last 30 days of completed tasks
- Polling frequency: 5s (adjustable)

**If you need**:
- >1000 active tasks → Consider SQLite instead of JSON
- <1s latency → Use direct CLI instead of queue
- Scale to multiple agents → Centralized state server

## Monitoring & Observability

**Logs**:
- `logs/task-runner-YYYY-MM-DD.log` — All executions
- `logs/approvals-YYYY-MM-DD.log` — All approvals/rejections

**Audit Trail**:
- Every task has `created_at`, `updated_at`
- Approvals tracked: `approved_by`, `approved_at`
- Errors logged: `error` field
- Results captured: `result` field

**State Snapshots**:
- `state/agent-state.json` is the current snapshot
- Backup before major changes
- Completed tasks can be archived

## Failure Modes & Recovery

| Scenario | Impact | Recovery |
|----------|--------|----------|
| agent-state.json corrupts | Queue lost, tasks re-submit via Telegram | Restore from backup |
| Task runner crashes | Pending tasks remain queued | Restart runner |
| Telegram bot down | Can't submit new tasks | Restart bot, resubmit via CLI |
| Skill fails | Task marked failed, retry up to 3x | Check logs, fix skill, re-run |
| Approval gate down | Can still execute auto-approved tasks | Restart and approve pending |

All interfaces are **stateless** — recovery is just restarting the component. State always lives in the JSON file.

## Future Evolution

**Phase 2**: Skill implementations (reminder, home-automation, scheduler)
**Phase 3**: Web dashboard, voice assistant integration, advanced autonomy
**Future**: Distributed agent coordination, machine learning for approval predictions

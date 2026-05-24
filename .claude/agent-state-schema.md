# Agent State Schema

The single source of truth for the unified agent brain. All interfaces (CLI, Telegram, n8n) read/write here.

## File: `.claude/agent-state.json`

### Root Object
```json
{
  "version": "1.0",
  "agent_state": "idle|busy|sleeping|error",
  "last_sync": "ISO 8601 timestamp",
  "pending_tasks": [task],
  "completed_tasks": [task],
  "metadata": {...}
}
```

### Agent States
- **idle**: Waiting for tasks, ready to execute
- **busy**: Currently executing a task or processing queue
- **sleeping**: Scheduled rest period (do not submit tasks)
- **error**: Last task failed, requires human attention

### Task Object
```json
{
  "id": "unique-task-id (uuid v4)",
  "source": "cli|telegram|n8n",
  "source_user": "user-id or 'system'",
  "task_type": "reminder|automation|query|schedule",
  "task": "description of what to do",
  "due": "ISO 8601 timestamp (optional)",
  "priority": "low|normal|high",
  "status": "pending|approved|rejected|executing|completed|failed",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "skill": "skill-name-to-handle-this",
  "approval_required": true|false,
  "approved_by": "user-id or null",
  "approved_at": "ISO 8601 timestamp or null",
  "result": "execution result or null",
  "error": "error message or null",
  "retry_count": 0,
  "notify_on_complete": true|false,
  "notify_channels": ["telegram", "cli"],
  "metadata": {}
}
```

### Metadata Object
```json
{
  "created": "ISO 8601 timestamp",
  "updated": "ISO 8601 timestamp",
  "primary_interface": "cli",
  "secondary_interfaces": ["telegram", "n8n"],
  "version": "1.0"
}
```

## Task States Lifecycle
```
pending → [approval_required?] → approved/rejected → executing → completed/failed
                                    ↓ (approval_required=false)
                                 executing → completed/failed
```

## Task Types & Skills Mapping
| Task Type | Skill | Examples |
|-----------|-------|----------|
| reminder | reminder-engine | "remind me about laundry", "daily standup at 9am" |
| automation | home-automation | "turn off lights", "start dishwasher" |
| schedule | schedule-manager | "run cleanup every Wednesday 6pm", "backup at 3am daily" |
| query | research | "what's the weather", "research Claude Code patterns" |
| trigger | n8n-orchestrator | "execute workflow X", "check n8n status" |

## Approval Rules
- **Destructive operations** (deletion, power control): approval_required = true
- **Resource-heavy operations** (backup, full scan): approval_required = true
- **Simple tasks** (reminders, info queries): approval_required = false
- **Telegram submissions**: All approval_required = true (user must approve via CLI)

## Usage Examples

### Task Submission (from Telegram)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "telegram",
  "source_user": "wife",
  "task_type": "reminder",
  "task": "remind me to check laundry at 6pm",
  "due": "2026-05-24T18:00:00Z",
  "priority": "normal",
  "status": "pending",
  "skill": "reminder-engine",
  "approval_required": true,
  "notify_channels": ["telegram"]
}
```

### Task Submission (from CLI)
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "source": "cli",
  "source_user": "user",
  "task_type": "query",
  "task": "research latest Claude Code features",
  "priority": "normal",
  "status": "pending",
  "skill": "research",
  "approval_required": false
}
```

## Synchronization Rules
1. All writes must be atomic (use temp file + mv)
2. Reads should deserialize and validate schema
3. Completed tasks move from pending_tasks to completed_tasks
4. Failed tasks retry up to 3 times before requiring manual intervention
5. Purge completed_tasks older than 30 days monthly

## Interface Responsibilities

### CLI
- Read pending_tasks, submitted by user or other sources
- Update status: pending → executing → completed/failed
- Add high-priority tasks with approval_required = false
- Query agent_state to decide autonomy level

### Telegram Bot
- Submit tasks with source = "telegram", approval_required = true
- Read completed_tasks to notify user of results
- Only read agent_state (no direct writes)
- Sanitize input to prevent injection

### Task Runner (Autonomous Loop)
- Poll pending_tasks, execute in priority order
- Use skill specified in task.skill field
- Update status, result, error
- Notify channels on completion

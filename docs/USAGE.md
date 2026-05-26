# Usage Guide

## Interfaces

The agent can be accessed through three main interfaces:

| Interface | User | Approval Required? | Use Case |
|-----------|------|-------------------|----------|
| **CLI** | Owner/Power User | No (owner trusted) | Full control, scripting, direct tasks |
| **Telegram** | Owner, Family | Yes (non-owner) | Mobile convenience, family task submission |
| **HTTP API** | External Systems (n8n) | No (system source) | Automation workflows, webhooks |

## CLI Interface (Primary)

The owner can submit and manage tasks directly via command line.

### Submit a Task

```bash
# Basic task
python3 ./.claude/agent-state-utils.py add-task cli user query "what's the weather?" research false normal

# Parameters:
# add-task <source> <user> <type> <desc> <skill> [approval] [priority]
#   source: cli, telegram, or n8n
#   user: who submitted (your name, or "system")
#   type: reminder, automation, query, schedule
#   desc: human-readable task description
#   skill: which skill to use (research, reminder-engine, home-automation, etc.)
#   approval: true/false - does this need approval before execution?
#   priority: low, normal, or high

# High-priority task with approval
python3 ./.claude/agent-state-utils.py add-task cli user automation "backup database" n8n-orchestrator true high

# Immediate query (no approval needed)
python3 ./.claude/agent-state-utils.py add-task cli user query "research AI trends" research false high
```

### View Tasks

```bash
# List pending tasks (awaiting approval or execution)
python3 ./.claude/agent-state-utils.py list-pending

# List completed tasks (includes results)
python3 ./.claude/agent-state-utils.py list-completed

# Get specific task details
python3 ./.claude/agent-state-utils.py get-task <task-id>

# Example output:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "task": "research AI trends",
#   "status": "pending",
#   "skill": "research",
#   "created_at": "2026-05-24T12:00:00Z",
#   "approval_required": false
# }
```

### Execute Tasks

```bash
# Run once (execute all pending/approved tasks)
./.claude/scripts/task-runner.sh run

# Run continuously (with 5-second polling)
./.claude/scripts/task-runner.sh loop 0 &

# Run N iterations then exit
./.claude/scripts/task-runner.sh loop 10

# Check logs
tail -f logs/task-runner-$(date +%Y-%m-%d).log
```

### Approve/Reject Tasks

```bash
# Approve a pending task (no confirmation)
python3 ./.claude/agent-state-utils.py approve <task-id> user

# Reject a task (moves to completed)
python3 ./.claude/agent-state-utils.py reject <task-id> user

# Or use the interactive approval gate
./.claude/approval-gate.sh approve <task-id>  # Asks for confirmation
```

## Telegram Interface (Secondary)

Secondary users (wife, family members) can submit tasks via Telegram. Tasks require approval from the owner before execution.

### Setup

1. Get your Telegram User ID:
   - Start the bot: `npm start`
   - Send `/chatid` command
   - Bot replies with your Chat ID and User ID

2. Set environment variables (in `.env`):
   ```bash
   BOT_TOKEN=<your-bot-token>
   OWNER_ID=<your-user-id>
   WIFE_ID=<wife-user-id>     # Optional
   GROUP_ID=<group-chat-id>   # Optional
   ```

3. Start the bot:
   ```bash
   npm start
   ```

### Submit a Task (Non-Owner User)

Simply send a message to the bot:

```
Wife: "remind me to check the mail"
Bot: "📝 Task queued (ID: a1b2c3d4) - Non-owner operation, requires approval"
```

The bot:
- Reads the message
- Creates a task with `approval_required=true` (non-owner)
- Queues it
- Replies immediately (no blocking)

### Owner Reviews Pending

```bash
# See all pending approvals
./.claude/approval-gate.sh list

# Output:
# 📋 1 task(s) pending approval:
#
# 1. 👤 [a1b2c3d4] telegram | wife
#    Task: remind me to check the mail...
#    Type: reminder | Skill: reminder-engine
```

### Owner Approves

```bash
# Interactive approval with confirmation
./.claude/approval-gate.sh approve-index 1

# Or use task ID directly
./.claude/approval-gate.sh approve a1b2c3d4-1234-5678-90ab-cdef12345678
```

The task moves to `approved` status. On the next task-runner cycle, it executes.

### Notification

When the task completes, the user receives a Telegram notification:

```
Bot: "✅ Task completed: Reminder set for mail check"
```

## HTTP API (n8n Integration)

External systems like n8n can submit tasks via HTTP.

### Submit a Task

```bash
curl -X POST http://localhost:3000/task \
  -H "Content-Type: application/json" \
  -d '{
    "task": "backup database",
    "taskType": "automation",
    "skill": "n8n-orchestrator"
  }'

# Response:
# {"taskId": "550e8400-e29b-41d4-a716-446655440000", "status": "queued"}
```

**Parameters**:
- `task` (required): Task description
- `taskType` (optional): automation, reminder, query, schedule (default: automation)
- `skill` (optional): Which skill to use (default: n8n-orchestrator)

### Check Task Status

```bash
curl http://localhost:3000/task/550e8400-e29b-41d4-a716-446655440000

# Response:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "task": "backup database",
#   "status": "completed",
#   "result": "Backup completed successfully",
#   "error": null
# }
```

### List Pending Tasks

```bash
curl http://localhost:3000/tasks/pending

# Response: Array of pending tasks
```

### Get Agent Status

```bash
curl http://localhost:3000/status

# Response:
# {
#   "agent_state": "idle",
#   "pending_tasks": 2,
#   "last_sync": "2026-05-24T12:30:45Z"
# }
```

## Workflow Examples

### Example 1: Owner Submits Research Query (CLI)

```bash
# Owner submits research task
python3 ./.claude/agent-state-utils.py add-task cli user query "latest Claude capabilities" research false high

# Immediately execute
./.claude/scripts/task-runner.sh run

# Check result
python3 ./.claude/agent-state-utils.py list-completed | tail -1 | jq '.result'

# Output: "Claude 4.7 released with improved reasoning..."
```

### Example 2: Wife Requests Reminder (Telegram)

```
Wife: "remind me to call mom on Friday"
Bot: "📝 Task queued, requires approval"

Owner: ./.claude/approval-gate.sh list
Owner: ./.claude/approval-gate.sh approve-index 1
Wife: [Telegram notification] "✅ Reminder set for Friday"
```

### Example 3: n8n Triggers Backup (HTTP)

```bash
# n8n workflow sends POST request
curl -X POST http://localhost:3000/task \
  -d '{"task": "backup home server", "taskType": "automation"}'

# Task queued immediately (no approval for n8n)

# On next task-runner cycle:
# 1. Task moves to executing
# 2. Skill (n8n-orchestrator) triggers actual backup
# 3. Task marked completed with result
# 4. No user notification (n8n can poll status instead)
```

### Example 4: Owner Approves Multiple Tasks

```bash
# Wife submitted several tasks
./.claude/approval-gate.sh list

# Output:
# 📋 3 task(s) pending approval:
#
# 1. 👤 [id1] telegram | wife: reminder about dentist
# 2. 👤 [id2] telegram | wife: turn on living room lights
# 3. 👤 [id3] telegram | wife: schedule laundry for 6pm

# Owner approves all
./.claude/approval-gate.sh approve-index 1
./.claude/approval-gate.sh approve-index 2
./.claude/approval-gate.sh approve-index 3

# Or auto-approve low-risk ones
./.claude/approval-gate.sh auto-approve reminder

# Then run task-runner
./.claude/scripts/task-runner.sh run

# All execute and wife gets notifications
```

## Commands Reference

### Agent State Utils

```bash
# Add task
python3 ./.claude/agent-state-utils.py add-task <source> <user> <type> <desc> <skill> [approval] [priority]

# List and view
python3 ./.claude/agent-state-utils.py list-pending
python3 ./.claude/agent-state-utils.py list-completed
python3 ./.claude/agent-state-utils.py get-task <task-id>

# Manage state
python3 ./.claude/agent-state-utils.py set-state <state>  # idle, busy, sleeping, error

# Approve/Reject
python3 ./.claude/agent-state-utils.py approve <task-id> <user>
python3 ./.claude/agent-state-utils.py reject <task-id> <user>

# Update status
python3 ./.claude/agent-state-utils.py update-status <task-id> <status> [result] [error]
```

### Task Runner

```bash
# Execute once
./.claude/scripts/task-runner.sh run

# Run continuously
./.claude/scripts/task-runner.sh loop 0          # Forever
./.claude/scripts/task-runner.sh loop 10         # 10 iterations

# In background
./.claude/scripts/task-runner.sh loop 0 &
```

### Approval Gate

```bash
# Review tasks
./.claude/approval-gate.sh list
./.claude/approval-gate.sh show <task-id>

# Approve/Reject
./.claude/approval-gate.sh approve <task-id>          # Interactive
./.claude/approval-gate.sh approve-index <n>         # By index
./.claude/approval-gate.sh reject <task-id>          # Interactive
./.claude/approval-gate.sh auto-approve [pattern]    # Auto-approve matching

# Monitoring
./.claude/approval-gate.sh watch [interval]          # Continuous monitor (5s default)
```

### Telegram Bot

```bash
# Start bot
npm start

# In background
npm start &

# As service
sudo systemctl start claude-agent
sudo systemctl status claude-agent
```

## Best Practices

### For Owner (CLI)

✅ **DO**:
- Use CLI for complex, high-priority tasks
- Run `./.claude/scripts/task-runner.sh run` after submitting important tasks
- Regularly check logs: `tail -f logs/task-runner-*.log`
- Backup `state/agent-state.json` regularly
- Review approval logs: `tail logs/approvals-*.log`

❌ **DON'T**:
- Submit destructive tasks without intending them
- Manually edit `agent-state.json` (use utils instead)
- Leave task-runner stopped for extended periods
- Ignore approval requests from family members

### For Secondary Users (Telegram)

✅ **DO**:
- Use natural language ("remind me...", "turn on...", "tell me...")
- Wait for owner approval before expecting execution
- Check for notification when task completes
- Submit time-sensitive tasks during owner's active hours

❌ **DON'T**:
- Try to submit commands (bot only takes descriptions)
- Assume tasks execute immediately (they're queued)
- Submit sensitive/private info (stored in state file)
- Resubmit if you don't see response (check with owner)

### For Automation (HTTP API/n8n)

✅ **DO**:
- Include descriptive task descriptions
- Poll status endpoint for completion
- Handle 400/500 errors gracefully
- Use consistent taskType and skill names

❌ **DON'T**:
- Spam with hundreds of tasks at once
- Ignore failed tasks (they're logged)
- Assume immediate execution (5s polling interval)
- Store sensitive data in task descriptions

## Monitoring & Logs

### View Logs

```bash
# Task execution logs
tail -f logs/task-runner-$(date +%Y-%m-%d).log

# Approval decisions
tail -f logs/approvals-$(date +%Y-%m-%d).log

# Recent 10 executions
tail -10 logs/task-runner-*.log

# Follow bot startup
npm start 2>&1 | tee logs/bot-startup.log
```

### Check Health

```bash
# Quick health check
curl http://localhost:3000/health

# Check agent status
curl http://localhost:3000/status | jq .

# Verify state file
python3 -c "import json; json.load(open('state/agent-state.json'))" && echo "✅ State valid"

# Count tasks
echo "Pending: $(python3 ./.claude/agent-state-utils.py list-pending | jq 'length')"
echo "Completed: $(python3 ./.claude/agent-state-utils.py list-completed | jq 'length')"
```

## Troubleshooting

### "Task not found" error

```bash
# Make sure task ID is correct
python3 ./.claude/agent-state-utils.py list-pending | jq '.[] | .id'

# Copy exact ID and try again
```

### Telegram bot doesn't respond

```bash
# Check bot is running
npm start &

# Send /chatid to verify your ID is in OWNER_ID or WIFE_ID
# Check .env file has correct BOT_TOKEN and IDs

# View logs
tail logs/bot-*.log
```

### Task stuck in "executing" state

```bash
# Check if task-runner is still running
ps aux | grep task-runner

# View logs for error
tail logs/task-runner-*.log | grep -A5 "executing"

# Manually update status if task truly failed
python3 ./.claude/agent-state-utils.py update-status <task-id> failed "Stuck in executing"
```

### State file corrupted

```bash
# Restore from backup
cp backups/agent-state-latest.json state/agent-state.json

# Or recreate with empty state
python3 ./.claude/agent-state-utils.py set-state idle

# Any lost tasks will be resubmitted via Telegram
```

More help in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

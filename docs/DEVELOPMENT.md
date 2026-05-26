# Development & Extension

## Adding New Skills

### Skill Structure

Each skill is a domain-specific executor. Create a new skill:

```bash
mkdir -p skills/<skill-name>
cd skills/<skill-name>

# Create these files:
touch SKILL.md      # Interface definition
touch README.md     # Implementation guide
touch execute.sh    # Optional: shell implementation
```

### Skill Interface (SKILL.md)

```markdown
# Reminder Engine Skill

## Purpose
Create, track, and execute reminders at specified times.

## Inputs
- description: Task description (e.g., "remind about laundry at 6pm")
- due_time: ISO timestamp when reminder should trigger

## Outputs
- success: true/false
- reminder_id: UUID of the reminder
- next_trigger: ISO timestamp of next execution

## Constraints
- Max 100 active reminders
- Reminders stored in state/agent-state.json
- Re-execution on failure (up to 3 retries)

## Examples
- "remind me to call mom Friday at 2pm"
- "daily standup at 9am weekdays"
- "backup database every Sunday 3am"
```

### Task Runner Integration

Add execution function to `./.claude/scripts/task-runner.sh`:

```bash
# In task-runner.sh, add:

execute_reminder_skill() {
  local task_id="$1"
  local task_desc="$2"

  log "  🔔 Reminder: $task_desc"

  # Parse task description for time
  local parse_result=$(parse_reminder_time "$task_desc")
  
  if [[ $? -ne 0 ]]; then
    python3 "$UTILS" update-status "$task_id" "failed" "" "Could not parse reminder time"
    return 1
  fi

  # Store reminder
  local reminder_id=$(create_reminder "$parse_result")

  # Update task with result
  python3 "$UTILS" update-status "$task_id" "completed" "Reminder scheduled: $reminder_id"
}

# Helper functions
parse_reminder_time() {
  local desc="$1"
  # Parse "reminder about X at TIME on DAY"
  # Return structured data
  echo "$desc" | grep -oP '(?<=at\s)\d{1,2}(?::\d{2})?(?:\s*(?:am|pm)?)'
}

create_reminder() {
  local time_spec="$1"
  # Store in agent-state or external system
  # Return reminder UUID
  echo "reminder-$(date +%s)"
}
```

### Phase 2 Skills (TODO)

**reminder-engine**:
- Parse natural language: "remind me about X on Friday at 2pm"
- Store in agent-state or external calendar
- Trigger at specified time
- Support recurring reminders

**home-automation**:
- Control lights, temperature, appliances
- Integrate with n8n (192.168.50.153)
- Call Proxmox API for VM control
- Return success/failure status

**schedule-manager**:
- Parse cron-like syntax
- Create recurring tasks
- Execute at specified intervals

**n8n-orchestrator**:
- Trigger n8n workflows
- Parse workflow responses
- Handle retries and callbacks

## Code Patterns

### State Management Pattern

```python
# Always read fresh before modifying
state = load_state()

# Make changes
state['pending_tasks'].append(new_task)
state['updated_at'] = iso_timestamp()

# Write atomically
save_state(state)
```

### Error Handling Pattern

```bash
# In skill execution:
if some_error; then
  # Retry logic
  retry_count=$((retry_count + 1))
  if [[ $retry_count -lt 3 ]]; then
    python3 "$UTILS" update-status "$task_id" "pending" "" "Retrying..."
  else
    python3 "$UTILS" update-status "$task_id" "failed" "" "Max retries exceeded: $error"
  fi
  return 1
fi
```

### Logging Pattern

```bash
log "✅ Action: description"      # Success
log "⏳ Action: description"       # In progress
log "❌ ERROR: description"        # Error
log_error "Critical: description" # To stderr + log
```

### Testing Pattern

```bash
# Before using in production:

# 1. Create test task
TEST_TASK=$(python3 ./.claude/agent-state-utils.py add-task cli user query "test skill" <skill> false normal)
echo "Created: $TEST_TASK"

# 2. Run once
./.claude/scripts/task-runner.sh run

# 3. Check result
python3 ./.claude/agent-state-utils.py get-task "$TEST_TASK" | jq '{status, result, error}'

# 4. Check logs
tail logs/task-runner-*.log | grep -A3 "Executing $TEST_TASK"

# 5. Verify side effects (if any)
# E.g., if home-automation skill, check lights actually turned on
```

## Approval Rule Customization

### By Default

```bash
# In telegram-bot.js:
- CLI tasks: approval_required = false (owner trusted)
- Telegram by owner: approval_required = false (owner trusted)
- Telegram by non-owner: approval_required = true
- Destructive keywords (delete, drop, etc.): approval_required = true
- n8n/system: approval_required = false
```

### Customize Approval Logic

```bash
# Edit telegram-bot.js:

function shouldRequireApproval(task, source, userId) {
  // Default logic
  if (source !== 'telegram') return false;
  if (userId === OWNER_ID) return false;
  if (isDestructiveTask(task)) return true;
  return true; // Non-owner telegram requires approval
}

// Customize as needed:
// - Auto-approve reminders for wife
// - Always require approval for power operations
// - Require approval only during certain hours
// etc.
```

## Notification Customization

### Current Channels

```bash
# telegram — notify via Telegram bot
if [[ "$channel" == "telegram" ]]; then
  send_telegram_notification "$user" "$message"
fi

# email — TODO: future
# slack — TODO: future
# webhook — TODO: future
```

### Add New Notification Channel

```bash
# 1. Add to task.notify_channels
python3 ./.claude/agent-state-utils.py add-task ... 
# In add-task function:
# 'notify_channels': ['telegram', 'email', 'webhook']

# 2. Implement handler
notify_completion() {
  local task_id="$1"
  local status="$2"
  local channels=$(get_task_channels "$task_id")
  
  for channel in $channels; do
    case "$channel" in
      telegram) send_telegram_notification ... ;;
      email) send_email_notification ... ;;
      webhook) post_webhook_notification ... ;;
    esac
  done
}
```

## Performance Tuning

### Task Runner Polling

```bash
# In task-runner.sh:
# Change sleep interval (default 5s)
sleep 5  # ← adjust based on latency needs

# Fewer retries for faster failure
max_retries=3  # ← can reduce to 1-2

# Batch processing
# Execute multiple tasks in parallel (if stateless):
for task_id in $task_ids; do
  execute_task "$task_id" &
done
wait
```

### State File Size

```bash
# Archive old completed tasks monthly
python3 << 'EOF'
import json
from datetime import datetime, timedelta

state = json.load(open('state/agent-state.json'))

# Keep only last 30 days
cutoff = (datetime.now() - timedelta(days=30)).isoformat()
state['completed_tasks'] = [
    t for t in state['completed_tasks']
    if t['updated_at'] > cutoff
]

json.dump(state, open('state/agent-state.json', 'w'), indent=2)
print(f"Archived to {len(state['completed_tasks'])} tasks")
EOF
```

## Testing Guide

### Unit Tests

```bash
# Test state utils
python3 -m pytest .claude/agent-state-utils.py -v

# Or manually:
TASK=$(python3 ./.claude/agent-state-utils.py add-task cli user reminder "test" reminder-engine false normal)
python3 ./.claude/agent-state-utils.py get-task "$TASK" | jq '.id' | grep -q "$TASK" && echo "✅ State utils working"
```

### Integration Tests

```bash
# Full pipeline test
bash << 'TESTEOF'
set -e

# 1. Add task
TASK=$(python3 ./.claude/agent-state-utils.py add-task cli user query "test" research false normal)
echo "✅ Task created: $TASK"

# 2. Check pending
COUNT=$(python3 ./.claude/agent-state-utils.py list-pending | jq 'length')
[[ $COUNT -gt 0 ]] && echo "✅ Task in pending" || exit 1

# 3. Run once
./.claude/scripts/task-runner.sh run > /tmp/runner.log 2>&1
grep -q "Executing" /tmp/runner.log && echo "✅ Task executed" || exit 1

# 4. Check completed
COMPLETED=$(python3 ./.claude/agent-state-utils.py get-task "$TASK" | jq '.status')
[[ "$COMPLETED" == '"completed"' ]] && echo "✅ Task completed" || exit 1

echo "✅ All tests passed"
TESTEOF
```

## Git Workflow

### Commit Message Format

```bash
# Feature
git commit -m "feat: add reminder-engine skill

Implements natural language reminder parsing and scheduling.
Supports recurring reminders (daily, weekly, etc.)
Stores reminders in agent-state.json

Co-Authored-By: Claude Haiku <noreply@anthropic.com>"

# Bug fix
git commit -m "fix: prevent concurrent state writes

Refactor state-utils.py to use atomic file ops (temp+mv)
Fixes race condition when multiple components write simultaneously"

# Docs
git commit -m "docs: add skill development guide

Includes patterns for new skills, testing, and integration"
```

### Branch Strategy

```bash
# Feature branch
git checkout -b feature/reminder-engine

# Work and test
./.claude/scripts/task-runner.sh run
# ... make changes ...
git add -A
git commit -m "feat: add reminder-engine"

# Merge to main
git checkout main
git pull
git merge feature/reminder-engine
git push origin main

# Cleanup
git branch -d feature/reminder-engine
```

## Monitoring & Debugging

### Check Component Status

```bash
# State file
json state/agent-state.json | head

# Task runner
ps aux | grep task-runner

# Telegram bot
ps aux | grep "node\|telegram"

# Recent errors
grep ERROR logs/*.log | tail -5

# Agent state
python3 ./.claude/agent-state-utils.py set-state busy  # Change state
# Should see in state/agent-state.json: "agent_state": "busy"
```

### Debug a Failing Task

```bash
TASK_ID="550e8400-e29b-41d4-a716-446655440000"

# 1. Check task details
python3 ./.claude/agent-state-utils.py get-task "$TASK_ID" | jq .

# 2. Check logs
grep "$TASK_ID" logs/*.log

# 3. Manually re-run the skill
. ./.claude/scripts/task-runner.sh
execute_research_skill "$TASK_ID" "test query"

# 4. Check state after
python3 ./.claude/agent-state-utils.py get-task "$TASK_ID" | jq '.error'

# 5. Fix and retry
python3 ./.claude/agent-state-utils.py update-status "$TASK_ID" "pending" "" ""
./.claude/scripts/task-runner.sh run
```

## Memory & Learning

After adding new features, update memories:

```bash
# Document the pattern
cat >> /home/claude/.claude/projects/-opt-claude-agent/memory/implementation_patterns.md << 'EOF'

### New Skill Pattern
[Document what you learned]

Co-Authored-By: Claude Haiku
EOF
```

## Next Steps

1. **Pick a skill**: Choose from Phase 2 list (reminder, home-automation, schedule)
2. **Create SKILL.md**: Define interface
3. **Add to task-runner**: Implement execute function
4. **Test**: Run `./.claude/scripts/task-runner.sh run` with test task
5. **Document**: Add to docs/SKILLS.md
6. **Commit**: Push to git with meaningful message

See [SKILLS.md](SKILLS.md) for skill-specific documentation.

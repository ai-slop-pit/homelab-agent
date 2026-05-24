# Troubleshooting Guide

## Common Issues & Solutions

### 1. Agent State File Issues

**Problem**: "agent-state.json not found" or "invalid JSON"

**Solutions**:
```bash
# Check if file exists
ls -la .claude/agent-state.json

# Recreate with defaults
python3 ./.claude/agent-state-utils.py set-state idle

# Restore from backup
cp backups/agent-state-20260524.json .claude/agent-state.json

# Validate JSON
python3 -c "import json; json.load(open('.claude/agent-state.json'))" && echo "Valid"
```

**Prevention**:
- Regular backups: `cp .claude/agent-state.json backups/$(date +%Y%m%d).json`
- Never edit directly; use utils instead
- Keep backups directory: `mkdir -p backups`

---

### 2. Telegram Bot Won't Start

**Problem**: Bot crashes immediately or doesn't respond to messages

**Solution Steps**:
```bash
# 1. Check credentials in .env
cat .env

# 2. Verify BOT_TOKEN is valid
# Get from BotFather: @BotFather on Telegram

# 3. Check IDs are correct
# Your ID: send /chatid to any bot, it replies with your ID

# 4. Test bot manually
npm start &
# Send /chatid
# Bot should reply with Chat ID: ...

# 5. Check logs
tail logs/telegram-*.log

# 6. Port conflict?
lsof -i :3000  # Is something else using port 3000?
kill -9 $(lsof -t -i :3000)  # Kill if needed
```

**Common Issues**:
- ❌ Wrong BOT_TOKEN (copy-paste typo)
- ❌ OWNER_ID is missing (bot won't respond to anyone)
- ❌ Port 3000 already in use (npm start fails silently)
- ❌ Network issues (can't reach Telegram API)

---

### 3. Task Runner Not Executing Tasks

**Problem**: Tasks stay "pending" even after running task-runner

**Solution Steps**:
```bash
# 1. Check task-runner is running
ps aux | grep task-runner

# 2. Run once with debug output
bash -x ./.claude/task-runner.sh run 2>&1 | head -50

# 3. Check state file
python3 ./.claude/agent-state-utils.py list-pending | jq '.[0]'

# 4. Check if approval required
python3 ./.claude/agent-state-utils.py list-pending | jq '.[] | {id, status, approval_required}'

# 5. Approve task if needed
python3 ./.claude/agent-state-utils.py approve <task-id> user

# 6. Check logs
tail logs/task-runner-*.log

# 7. Is agent_state stuck?
cat .claude/agent-state.json | jq '.agent_state'
# Should be "idle", "busy", or "sleeping"
# If "error": python3 ./.claude/agent-state-utils.py set-state idle
```

**Common Issues**:
- ❌ Task marked `approval_required=true` (needs manual approval)
- ❌ Task runner process crashed (check logs)
- ❌ Agent stuck in "busy" state (stale lock)
- ❌ Skill not implemented for task type

---

### 4. Tasks Stuck in "executing" State

**Problem**: Task appears to hang indefinitely with `status: "executing"`

**Solution**:
```bash
# 1. Get task details
python3 ./.claude/agent-state-utils.py get-task <task-id> | jq .

# 2. Check logs for error
grep "<task-id>" logs/task-runner-*.log

# 3. Manually reset status
python3 ./.claude/agent-state-utils.py update-status <task-id> failed "Manual reset due to hang"

# 4. Or mark completed
python3 ./.claude/agent-state-utils.py update-status <task-id> completed "Completed externally"

# 5. Restart task-runner if stuck
pkill task-runner.sh
./.claude/task-runner.sh run
```

**Prevention**:
- Implement timeouts in skills
- Add progress logging
- Set max retry count

---

### 5. HTTP API Returns 500 Error

**Problem**: POST /task returns "Internal Server Error"

**Solution**:
```bash
# 1. Check bot is running
curl http://localhost:3000/health

# 2. Check logs
tail -20 logs/telegram-error.log  # npm start logs

# 3. Restart bot
pkill node
npm start &

# 4. Test simple request
curl -X POST http://localhost:3000/task \
  -H "Content-Type: application/json" \
  -d '{"task": "test"}'

# 5. Check state file not corrupted
python3 -c "import json; json.load(open('.claude/agent-state.json'))"
```

**Common Issues**:
- ❌ Bot process crashed
- ❌ State file corrupted JSON
- ❌ Port 3000 not listening
- ❌ Node.js error (check logs)

---

### 6. Telegram Notifications Not Sent

**Problem**: Task completes but wife doesn't get Telegram notification

**Solution**:
```bash
# 1. Check task has notify_channels set
python3 ./.claude/agent-state-utils.py get-task <task-id> | jq '.notify_channels'

# 2. Check WIFE_ID is correct in .env
grep WIFE_ID .env

# 3. Test bot can send messages
npm start &
# Manual test: curl -X POST to telegram API directly

# 4. Check logs
grep "notify" logs/*.log | tail -5

# 5. Verify wife's ID matches
# Send /chatid to bot, verify ID matches WIFE_ID in .env
```

**Prevention**:
- Set `notify_channels: ["telegram"]` when adding tasks from Telegram
- Ensure WIFE_ID/OWNER_ID in .env match actual Telegram IDs

---

### 7. Performance Issues / Slow Execution

**Problem**: Tasks taking longer than expected, or lot of lag

**Solution**:
```bash
# 1. Check CPU/memory usage
top -p $(pgrep -f task-runner)

# 2. Check state file size (too many tasks?)
wc -l .claude/agent-state.json
# If >10MB, archive completed tasks

# 3. Check polling interval
grep "sleep " ./.claude/task-runner.sh
# Default 5s, can increase if tasks are less frequent

# 4. Profile skill execution
time ./.claude/task-runner.sh run

# 5. Check disk I/O
iostat 1 5

# Archive old tasks if slow
python3 << 'EOF'
import json
from datetime import datetime, timedelta

state = json.load(open('.claude/agent-state.json'))
cutoff = (datetime.now() - timedelta(days=30)).isoformat()
state['completed_tasks'] = [
    t for t in state['completed_tasks']
    if t['updated_at'] > cutoff
]
json.dump(state, open('.claude/agent-state.json', 'w'))
print(f"Archived {len(state['completed_tasks'])} tasks")
EOF
```

---

### 8. Skill Not Found / Executing

**Problem**: Task fails with "Unknown skill" or skill doesn't execute

**Solution**:
```bash
# 1. Check skill is registered in task-runner.sh
grep "execute_research_skill" ./.claude/task-runner.sh

# 2. Check skill name in task matches
python3 ./.claude/agent-state-utils.py get-task <task-id> | jq '.skill'

# 3. Test skill manually
source ./.claude/task-runner.sh
execute_research_skill "<task-id>" "test query"

# 4. Check skill script exists
ls -la .claude/skills/<skill-name>/

# 5. Check skill function in task-runner
grep -A10 "execute_<skill>_skill" ./.claude/task-runner.sh
```

**Common Issues**:
- ❌ Typo in skill name (reminder vs reminder-engine)
- ❌ Skill function not defined in task-runner.sh
- ❌ Skill script missing or not executable

---

### 9. State Corruption / Data Loss

**Problem**: Tasks disappeared or state file is corrupted

**Solution**:
```bash
# 1. Try to validate state
python3 -c "import json; d = json.load(open('.claude/agent-state.json')); print('Valid')"

# 2. If invalid, restore backup
ls -la backups/
cp backups/agent-state-20260524.json .claude/agent-state.json

# 3. If no backup, recreate from logs
# Check logs/task-runner-*.log and logs/approvals-*.log
# Manually reconstruct important tasks if needed

# 4. Implement atomic writes (should be in utils already)
# ./.claude/agent-state-utils.py uses temp file + mv
```

**Prevention**:
- Daily backups: `cron job copies agent-state.json`
- Version control: `git commit changes regularly`
- Never edit JSON manually (use utils)

---

### 10. Approval Gate Not Showing Pending Tasks

**Problem**: `./.claude/approval-gate.sh list` shows nothing but tasks exist

**Solution**:
```bash
# 1. Check pending tasks exist
python3 ./.claude/agent-state-utils.py list-pending | jq 'length'

# 2. Check if they require approval
python3 ./.claude/agent-state-utils.py list-pending | jq '.[] | {approval_required}'

# 3. Check their status
python3 ./.claude/agent-state-utils.py list-pending | jq '.[] | {status}'

# 4. Approval gate filters by: approval_required=true AND status=pending
# Only show those
python3 << 'EOF'
import json
state = json.load(open('.claude/agent-state.json'))
pending = [t for t in state.get('pending_tasks', [])
           if t['approval_required'] and t['status'] == 'pending']
print(f"Tasks awaiting approval: {len(pending)}")
for t in pending:
    print(f"  {t['id'][:8]}: {t['task']}")
EOF
```

---

## Diagnostic Commands

Quick health check:

```bash
#!/bin/bash
echo "=== Agent Health Check ==="

echo "✅ State file:"
python3 -c "import json; json.load(open('.claude/agent-state.json'))" && echo "  Valid JSON"

echo "✅ Pending tasks:"
python3 ./.claude/agent-state-utils.py list-pending | jq 'length'

echo "✅ Task runner:"
ps aux | grep task-runner | grep -v grep && echo "  Running" || echo "  Stopped"

echo "✅ Telegram bot:"
ps aux | grep "node\|telegram" | grep -v grep && echo "  Running" || echo "  Stopped"

echo "✅ HTTP API:"
curl -s http://localhost:3000/health | jq . 2>/dev/null && echo "  OK" || echo "  Unreachable"

echo "✅ Recent errors:"
grep ERROR logs/*.log 2>/dev/null | tail -3 || echo "  None"

echo "Done"
```

## Recovery Procedures

### Full Agent Reset (if everything breaks)

```bash
#!/bin/bash
# WARNING: This resets everything!

# 1. Stop all processes
pkill task-runner
pkill node

# 2. Backup current state
cp .claude/agent-state.json backups/agent-state-before-reset.json

# 3. Reinitialize state
python3 ./.claude/agent-state-utils.py set-state idle

# 4. Start services
npm start &
./.claude/task-runner.sh loop 0 &

echo "Agent reset complete"
```

### Restore from Backup

```bash
# 1. Choose backup
ls -la backups/

# 2. Restore
cp backups/agent-state-20260524.json .claude/agent-state.json

# 3. Restart
pkill task-runner
pkill node
npm start &
./.claude/task-runner.sh loop 0 &
```

---

## Getting Help

When reporting issues, include:

1. Agent version: `git log -1 --oneline`
2. Relevant error: `grep ERROR logs/*.log | head -5`
3. Task details: `python3 ./.claude/agent-state-utils.py get-task <task-id>`
4. System info: `uname -a`, `node -v`, `python3 --version`
5. Recent changes: `git log --oneline -5`

See [DEVELOPMENT.md](DEVELOPMENT.md) for debugging patterns.

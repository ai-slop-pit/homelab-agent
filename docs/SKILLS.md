# Skills Framework

Skills are the building blocks of task execution. Each skill handles a specific domain.

## Current Skills

### research

**Location**: `./skills/research/`

**Purpose**: Deep web research using Gemini models with web search enabled

**Input**: Research query  
**Output**: Summarized findings with sources

**Usage**:
```bash
# Via CLI
python3 ./.claude/agent-state-utils.py add-task cli user query "research AI trends" research false normal

# Via Telegram
"research latest Claude capabilities"
```

**Implementation**: Offloads to `research.sh` skill which uses Gemini 3.5 Flash with web search

---

## Planned Skills (Phase 2-3)

### reminder-engine

**Purpose**: Create, track, and execute reminders at specified times

**Status**: TODO — Phase 2

**Planned Features**:
- Parse natural language: "remind me about X on Friday at 2pm"
- Support recurring reminders: "daily standup at 9am weekdays"
- Store in agent-state.json or external calendar
- Trigger notifications at specified time

**Example Workflow**:
```
User: "remind me to call mom Friday at 2pm"
  ↓
Parser: Extracts time "Friday 14:00"
  ↓
Scheduler: Creates reminder entry
  ↓
At 14:00 Friday: Notifies user via Telegram
```

**Implementation Details**:
```bash
# In task-runner.sh
execute_reminder_skill() {
  local task_id="$1"
  local task_desc="$2"
  
  # Parse time from description
  # Create reminder
  # Store in agent-state or external system
  # Return reminder ID
}
```

---

### home-automation

**Purpose**: Control home devices, appliances, lights, and climate

**Status**: TODO — Phase 2

**Planned Features**:
- Control smart lights (brightness, color, on/off)
- Adjust temperature/HVAC
- Control appliances (washer, dryer, etc.)
- Integrate with Proxmox VMs (start/stop)
- Call n8n workflows for complex automation

**Example Tasks**:
```
"turn on living room lights"
"set temperature to 72 degrees"
"start dishwasher"
"stop laundry machine"
"power on server VM"
```

**Implementation**:
```bash
# API calls to:
# - Proxmox API (192.168.50.2) for VM control
# - n8n (192.168.50.153) for device control
# - MQTT broker for smart home devices (if configured)

execute_home_automation_skill() {
  local task_id="$1"
  local task_desc="$2"
  
  # Parse command: "turn on lights"
  # Call appropriate API
  # Update task status
}
```

---

### schedule-manager

**Purpose**: Create recurring tasks and schedules

**Status**: TODO — Phase 2

**Planned Features**:
- Parse cron syntax and natural language
- Create recurring tasks: "run backup every Sunday at 3am"
- Store schedules in agent-state or crontab
- Execute at specified intervals

**Example Tasks**:
```
"backup database every Sunday 3am"
"daily standup at 9am weekdays"
"weekly report every Friday 5pm"
"monthly maintenance on the 1st at midnight"
```

**Implementation**:
```bash
# Convert natural language to cron format
# "every Sunday 3am" → "0 3 * * 0"
# Store in agent-state['schedules']
# Task runner checks schedules and executes

execute_schedule_skill() {
  local task_id="$1"
  local task_desc="$2"
  
  # Parse schedule: "daily at 9am"
  # Create cron entry
  # Store schedule
}
```

---

### n8n-orchestrator

**Purpose**: Trigger and manage external n8n workflows

**Status**: TODO — Phase 2

**Planned Features**:
- Trigger n8n workflows via HTTP webhooks
- Parse workflow responses and status
- Handle workflow failures and retries
- Fetch workflow results

**Example Usage**:
```
"execute backup workflow"
"run user onboarding flow"
"trigger email campaign"
```

**Integration Points**:
```bash
# n8n instance at 192.168.50.153:5678

# Submit workflow trigger
curl -X POST http://192.168.50.153:5678/webhook/<webhook-key> \
  -d '{"task": "backup database"}'

# Query workflow status
curl http://192.168.50.153:5678/api/v1/executions/<exec-id>

execute_n8n_orchestrator_skill() {
  local task_id="$1"
  local task_desc="$2"
  
  # Call n8n webhook
  # Monitor execution status
  # Return result
}
```

---

## Creating a New Skill

### Step 1: Plan the Skill

Define in `SKILL.md`:
```markdown
# [Skill Name]

## Purpose
[What does it do?]

## Input Format
[What task descriptions look like]

## Output Format
[What the skill returns]

## Examples
[Sample usage]
```

### Step 2: Create Skill Directory

```bash
mkdir -p ./skills/<skill-name>
cd ./skills/<skill-name>
touch SKILL.md README.md
```

### Step 3: Implement in Task Runner

Add to `./.claude/scripts/task-runner.sh`:

```bash
execute_<skill>_skill() {
  local task_id="$1"
  local task_desc="$2"

  log "  🔧 <Skill>: $task_desc"

  # Parse task description
  # Execute business logic
  # Handle errors

  local result=$(...) # Get result from execution
  
  if [[ $? -eq 0 ]]; then
    python3 "$UTILS" update-status "$task_id" "completed" "$result"
    return 0
  else
    python3 "$UTILS" update-status "$task_id" "failed" "" "Error: $error"
    return 1
  fi
}
```

### Step 4: Test

```bash
# Add test task
TASK=$(python3 ./.claude/agent-state-utils.py add-task cli user query "test skill" <skill-name> false normal)

# Run task-runner
./.claude/scripts/task-runner.sh run

# Check result
python3 ./.claude/agent-state-utils.py get-task "$TASK" | jq '{status, result, error}'
```

### Step 5: Document

Add to `docs/SKILLS.md`:
```markdown
### <skill-name>

**Purpose**: [description]
**Status**: [phase]
**Usage**: [examples]
```

### Step 6: Commit

```bash
git add skills/<skill-name>/ ./.claude/scripts/task-runner.sh docs/SKILLS.md
git commit -m "feat: add <skill-name> skill

[Description of what skill does]
[Examples of usage]"
```

---

## Skill Development Patterns

### Pattern: Parse Natural Language

```bash
parse_reminder() {
  local desc="$1"
  
  # Extract time: "at 2pm", "at 14:00", "Friday 2pm"
  local time=$(echo "$desc" | grep -oP '(?:at\s+)?\d{1,2}(?::\d{2})?(?:\s*(?:am|pm)?)?')
  
  # Extract day: "Friday", "next Monday", "tomorrow"
  local day=$(echo "$desc" | grep -oP '(?:Monday|Tuesday|...|today|tomorrow)')
  
  echo "{\"time\": \"$time\", \"day\": \"$day\"}"
}
```

### Pattern: External API Call

```bash
call_n8n_workflow() {
  local workflow_id="$1"
  local data="$2"
  
  local response=$(curl -s -X POST "http://192.168.50.153:5678/webhook/$workflow_id" \
    -H "Content-Type: application/json" \
    -d "$data" \
    --max-time 30)
  
  if [[ $? -eq 0 ]]; then
    echo "$response"
    return 0
  else
    return 1
  fi
}
```

### Pattern: Retry Logic

```bash
execute_with_retry() {
  local max_retries=3
  local attempt=1
  
  while [[ $attempt -le $max_retries ]]; do
    if $1; then
      return 0
    fi
    
    log "  Attempt $attempt failed, retrying..."
    attempt=$((attempt + 1))
    sleep $((2 ** (attempt - 1)))  # Exponential backoff
  done
  
  return 1
}
```

---

## Skill Roadmap

### Phase 2 (High Priority)
- [ ] reminder-engine — Essential for daily use
- [ ] home-automation — Core automation capability
- [ ] schedule-manager — Enable recurring tasks

### Phase 3 (Nice to Have)
- [ ] n8n-orchestrator — External workflow integration
- [ ] email-sender — Send emails based on tasks
- [ ] calendar-integration — Sync with calendar
- [ ] voice-assistant — Alexa/Google Home integration

### Future
- [ ] machine-learning — Learn from approval patterns
- [ ] predictive-execution — Anticipate needed tasks
- [ ] multi-agent coordination — Distributed agents
- [ ] web-dashboard — UI for monitoring

---

## Best Practices

✅ **DO**:
- Keep skills focused (one domain per skill)
- Use consistent error handling
- Log all operations
- Return detailed results
- Document with examples
- Test before production

❌ **DON'T**:
- Mix multiple domains in one skill
- Assume task descriptions are clean (validate)
- Ignore errors silently
- Return vague messages
- Skip documentation
- Deploy untested code

---

## Monitoring Skills

### Health Check

```bash
# Test each skill
for skill in research reminder-engine home-automation; do
  TASK=$(python3 ./.claude/agent-state-utils.py add-task cli user query "test" "$skill" false normal)
  ./.claude/scripts/task-runner.sh run
  STATUS=$(python3 ./.claude/agent-state-utils.py get-task "$TASK" | jq -r '.status')
  echo "$skill: $STATUS"
done
```

### Performance Metrics

```bash
# Count executions by skill
grep "Executing task" logs/task-runner-*.log | grep -oP '(?<=skill=)\w+' | sort | uniq -c

# Count failures by skill
grep "failed" logs/task-runner-*.log | grep -oP '(?<=skill=)\w+' | sort | uniq -c

# Average execution time
grep "Executing\|executing" logs/task-runner-*.log | awk '{print $NF}'
```

---

For implementation examples, see [DEVELOPMENT.md](DEVELOPMENT.md).

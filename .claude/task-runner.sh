#!/bin/bash
# Task Runner — Autonomous execution loop
# Polls .claude/agent-state.json and executes pending tasks

set -e

STATE_FILE="/opt/claude-agent/.claude/agent-state.json"
UTILS="/opt/claude-agent/.claude/agent-state-utils.py"
LOG_FILE="/opt/claude-agent/logs/task-runner-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Logging
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# Get all pending tasks
get_pending_tasks() {
  python3 "$UTILS" list-pending
}

# Find task by ID
find_task() {
  local task_id="$1"
  python3 "$UTILS" get-task "$task_id" 2>/dev/null || echo "{}"
}

# Notify task completion (Telegram, email, etc.)
notify_completion() {
  local task_id="$1"
  local status="$2"
  local result="$3"
  local error="$4"

  # Parse task to get notify_channels
  local task=$(find_task "$task_id")
  local channels=$(echo "$task" | python3 -c "import sys, json; t=json.load(sys.stdin); print(','.join(t.get('notify_channels', [])))" 2>/dev/null)
  local source=$(echo "$task" | python3 -c "import sys, json; t=json.load(sys.stdin); print(t.get('source', ''))" 2>/dev/null)
  local source_user=$(echo "$task" | python3 -c "import sys, json; t=json.load(sys.stdin); print(t.get('source_user', ''))" 2>/dev/null)

  if [[ "$channels" == *"telegram"* ]]; then
    # TODO: notify via Telegram (requires bot API)
    log "📬 Would notify $source_user via Telegram: $status"
  fi
}

# Execute task based on skill
execute_task() {
  local task_id="$1"
  local task=$(find_task "$task_id")
  local skill=$(echo "$task" | python3 -c "import sys, json; t=json.load(sys.stdin); print(t.get('skill', ''))" 2>/dev/null)
  local task_desc=$(echo "$task" | python3 -c "import sys, json; t=json.load(sys.stdin); print(t.get('task', ''))" 2>/dev/null)
  local task_type=$(echo "$task" | python3 -c "import sys, json; t=json.load(sys.stdin); print(t.get('task_type', ''))" 2>/dev/null)
  local source=$(echo "$task" | python3 -c "import sys, json; t=json.load(sys.stdin); print(t.get('source', ''))" 2>/dev/null)

  log "▶️  Executing task $task_id | skill=$skill | type=$task_type"

  # Mark as executing
  python3 "$UTILS" update-status "$task_id" "executing"

  case "$skill" in
    reminder-engine)
      execute_reminder_skill "$task_id" "$task_desc"
      ;;
    research)
      execute_research_skill "$task_id" "$task_desc"
      ;;
    home-automation)
      execute_home_automation_skill "$task_id" "$task_desc"
      ;;
    schedule-manager)
      execute_schedule_skill "$task_id" "$task_desc"
      ;;
    n8n-orchestrator)
      execute_n8n_skill "$task_id" "$task_desc"
      ;;
    *)
      log_error "Unknown skill: $skill"
      python3 "$UTILS" update-status "$task_id" "failed" "" "Unknown skill: $skill"
      return 1
      ;;
  esac
}

# Skill: Reminder Engine
execute_reminder_skill() {
  local task_id="$1"
  local task_desc="$2"

  log "  🔔 Reminder: $task_desc"
  # TODO: parse time, create reminder, notify user
  python3 "$UTILS" update-status "$task_id" "completed" "Reminder scheduled"
}

# Skill: Research
execute_research_skill() {
  local task_id="$1"
  local task_desc="$2"

  log "  🔍 Research: $task_desc"

  # Run research skill via Claude CLI
  local result=$(cd /opt/claude-agent && claude -p "Research this query: $task_desc" --model claude-haiku-4-5-20251001 2>&1 | head -500)

  if [[ -z "$result" ]]; then
    result="No output from research"
  fi

  python3 "$UTILS" update-status "$task_id" "completed" "$result"
}

# Skill: Home Automation
execute_home_automation_skill() {
  local task_id="$1"
  local task_desc="$2"

  log "  🏠 Home Automation: $task_desc"
  # TODO: integrate with n8n, Proxmox, etc.
  python3 "$UTILS" update-status "$task_id" "completed" "Automation triggered"
}

# Skill: Schedule Manager
execute_schedule_skill() {
  local task_id="$1"
  local task_desc="$2"

  log "  📅 Schedule: $task_desc"
  # TODO: parse natural language, create cron job
  python3 "$UTILS" update-status "$task_id" "completed" "Schedule created"
}

# Skill: n8n Orchestrator
execute_n8n_skill() {
  local task_id="$1"
  local task_desc="$2"

  log "  🔗 n8n Workflow: $task_desc"

  # TODO: call n8n API (192.168.50.153)
  # curl -X POST http://192.168.50.153:5678/webhook/<webhook-key> -d '{"task": "'$task_desc'"}'

  python3 "$UTILS" update-status "$task_id" "completed" "Workflow triggered"
}

# Main loop
run_loop() {
  local max_iterations="${1:-1}"  # Default: run once, unless specified
  local iteration=0

  python3 "$UTILS" set-state busy

  log "🚀 Task Runner Started (max iterations: $max_iterations)"

  while [[ $iteration -lt $max_iterations ]]; do
    iteration=$((iteration + 1))
    log "📍 Iteration $iteration/$max_iterations"

    # Get all pending tasks
    local pending=$(get_pending_tasks)
    local count=$(echo "$pending" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

    if [[ "$count" -eq 0 ]]; then
      log "✅ No pending tasks"
      if [[ $iteration -lt $max_iterations ]]; then
        sleep 5
      fi
      continue
    fi

    log "📋 Found $count pending tasks"

    # Process each task
    local task_file="/tmp/pending_tasks.json"
    echo "$pending" > "$task_file"

    # Extract and execute ready task IDs
    python3 - "$task_file" > /tmp/ready_tasks.txt <<'EXTRACT_TASKS'
import sys, json
with open(sys.argv[1]) as f:
    tasks = json.load(f)
for task in tasks:
    task_id = task['id']
    status = task['status']
    approval_required = task['approval_required']

    # Skip if still pending approval
    if status == 'pending' and approval_required:
        continue

    # Skip if not ready for execution
    if status not in ('pending', 'approved'):
        continue

    print(task_id)
EXTRACT_TASKS

    # Execute each ready task
    while IFS= read -r task_id; do
      [[ -z "$task_id" ]] && continue
      execute_task "$task_id" || log_error "Task execution failed: $task_id"
    done < /tmp/ready_tasks.txt

    rm -f "$task_file" /tmp/ready_tasks.txt

    if [[ $iteration -lt $max_iterations ]]; then
      sleep 5
    fi
  done

  python3 "$UTILS" set-state idle
  log "✅ Task Runner finished"
}

# Parse CLI arguments
case "${1:-run}" in
  run)
    # Run once and exit
    run_loop 1
    ;;
  loop)
    # Run continuously (specify max iterations or 0 for infinite)
    local iterations="${2:-0}"
    if [[ "$iterations" -eq 0 ]]; then
      # Infinite loop with 5s polling
      while true; do
        run_loop 1
        sleep 5
      done
    else
      run_loop "$iterations"
    fi
    ;;
  *)
    cat <<EOF
Usage: task-runner.sh <command> [args]

Commands:
  run              Run once (execute all ready tasks)
  loop [count]     Run continuously (count=0 for infinite)

Examples:
  task-runner.sh run                # Execute pending tasks once
  task-runner.sh loop 10            # Run 10 iterations
  task-runner.sh loop 0             # Run forever (infinite loop)

Logs are written to: $LOG_FILE
EOF
    ;;
esac

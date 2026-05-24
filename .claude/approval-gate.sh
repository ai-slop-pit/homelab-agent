#!/bin/bash
# Approval Gate Manager
# Review, approve, and reject pending tasks

set -e

UTILS="/opt/claude-agent/.claude/agent-state-utils.py"
LOG_FILE="/opt/claude-agent/logs/approvals-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# List tasks pending approval
list_pending_approvals() {
  local pending_file="/tmp/pending_tasks.json"
  python3 "$UTILS" list-pending > "$pending_file"

  python3 - "$pending_file" <<'PYTHON'
import sys, json
with open(sys.argv[1]) as f:
    tasks = json.load(f)
pending_approvals = [t for t in tasks if t['approval_required'] and t['status'] == 'pending']

if not pending_approvals:
    print("✅ No tasks pending approval")
else:
    print(f"📋 {len(pending_approvals)} task(s) pending approval:\n")
    for i, task in enumerate(pending_approvals, 1):
        source_badge = "👤" if task['source'] == 'telegram' else "🤖"
        print(f"{i}. {source_badge} [{task['id'][:8]}] {task['source']} | {task['source_user']}")
        print(f"   Task: {task['task'][:60]}...")
        print(f"   Type: {task['task_type']} | Skill: {task['skill']}")
        print()
PYTHON

  rm -f "$pending_file"
}

# Show details of a pending task
show_task_details() {
  local task_id="$1"
  local task_file="/tmp/task_details.json"
  python3 "$UTILS" get-task "$task_id" > "$task_file" 2>/dev/null || { echo "❌ Task not found"; return 1; }

  python3 - "$task_file" <<'PYTHON'
import sys, json
with open(sys.argv[1]) as f:
    task = json.load(f)

print(f"📝 Task Details")
print("─" * 50)
print(f"ID:             {task['id']}")
print(f"Source:         {task['source']} ({task['source_user']})")
print(f"Type:           {task['task_type']}")
print(f"Skill:          {task['skill']}")
print(f"Priority:       {task['priority']}")
print(f"Status:         {task['status']}")
print(f"Created:        {task['created_at']}")
print("─" * 50)
print(f"Task: {task['task']}")
print("─" * 50)
PYTHON

  rm -f "$task_file"
}

# Approve a task
approve_task() {
  local task_id="$1"
  local user="${2:-system}"

  # Show task details
  show_task_details "$task_id" || return 1

  # Confirm approval
  read -p "🔐 Approve this task? (yes/no): " response
  if [[ "$response" != "yes" ]]; then
    echo "❌ Approval cancelled"
    return 1
  fi

  # Execute approval
  python3 "$UTILS" approve "$task_id" "$user"
  log "✅ APPROVED: $task_id by $user"
  echo "✅ Task approved! Will execute on next runner cycle."
}

# Reject a task
reject_task() {
  local task_id="$1"
  local user="${2:-system}"

  # Show task details
  show_task_details "$task_id" || return 1

  # Confirm rejection
  read -p "🚫 Reject this task? (yes/no): " response
  if [[ "$response" != "yes" ]]; then
    echo "❌ Rejection cancelled"
    return 1
  fi

  # Execute rejection
  python3 "$UTILS" reject "$task_id" "$user"
  log "❌ REJECTED: $task_id by $user"
  echo "🚫 Task rejected and moved to completed."
}

# Approve by index (from list)
approve_by_index() {
  local index="$1"
  local user="${2:-system}"

  # Get pending approvals
  local task_id=$(python3 "$UTILS" list-pending | python3 - <<PYTHON
import sys, json
tasks = json.load(sys.stdin)
pending_approvals = [t for t in tasks if t['approval_required'] and t['status'] == 'pending']
if $index < 1 or $index > len(pending_approvals):
    print("")
else:
    print(pending_approvals[$index - 1]['id'])
PYTHON
)

  if [[ -z "$task_id" ]]; then
    echo "❌ Invalid task index"
    return 1
  fi

  approve_task "$task_id" "$user"
}

# Approve all low-risk tasks automatically
auto_approve() {
  local pattern="${1:-.*}"  # Optional regex pattern to match task descriptions

  python3 "$UTILS" list-pending | python3 - "$pattern" <<PYTHON
import sys, json, re
tasks = json.load(sys.stdin)
pattern = sys.argv[1]
low_risk_keywords = ['reminder', 'info', 'status', 'list', 'query', 'report']

pending_approvals = [t for t in tasks if t['approval_required'] and t['status'] == 'pending']

approved = 0
for task in pending_approvals:
    # Only auto-approve non-destructive, low-risk tasks
    is_safe = all(not task['task'].lower().__contains__(kw.lower()) for kw in ['delete', 'drop', 'destroy', 'rm ', 'kill', 'power off', 'reset'])
    is_matching = re.search(pattern, task['task'], re.IGNORECASE)

    if is_safe and is_matching:
        print(f"✅ Auto-approving: {task['id'][:8]} - {task['task'][:50]}")
        import subprocess
        subprocess.run(['python3', '$UTILS', 'approve', task['id'], 'auto-gate'], check=False)
        approved += 1

print(f"\n✅ Auto-approved {approved} task(s)")
PYTHON
}

# Watch mode: continuously display pending approvals
watch_approvals() {
  local interval="${1:-5}"

  clear
  echo "👀 Watching for pending approvals... (update interval: ${interval}s)"
  echo "Press Ctrl+C to stop"
  echo ""

  while true; do
    clear
    echo "👀 Approvals ($(date +'%H:%M:%S')) — Press Ctrl+C to exit"
    echo "─────────────────────────────────────"
    list_pending_approvals
    sleep "$interval"
  done
}

# Main CLI
case "${1:-help}" in
  list)
    list_pending_approvals
    ;;
  show)
    if [[ -z "$2" ]]; then
      echo "❌ Task ID required"
      exit 1
    fi
    show_task_details "$2"
    ;;
  approve)
    if [[ -z "$2" ]]; then
      echo "❌ Task ID required"
      exit 1
    fi
    approve_task "$2" "${3:-system}"
    ;;
  approve-index)
    if [[ -z "$2" ]]; then
      echo "❌ Index required"
      exit 1
    fi
    approve_by_index "$2" "${3:-system}"
    ;;
  reject)
    if [[ -z "$2" ]]; then
      echo "❌ Task ID required"
      exit 1
    fi
    reject_task "$2" "${3:-system}"
    ;;
  auto-approve)
    auto_approve "${2:-.*}"
    ;;
  watch)
    watch_approvals "${2:-5}"
    ;;
  *)
    cat <<EOF
Usage: approval-gate.sh <command> [args]

Commands:
  list                        List all pending approvals
  show <task-id>              Show task details
  approve <task-id> [user]    Approve a task (requires confirmation)
  approve-index <n> [user]    Approve by index from list
  reject <task-id> [user]     Reject a task (requires confirmation)
  auto-approve [pattern]      Auto-approve safe, matching tasks
  watch [interval]            Watch mode: continuously show approvals (default 5s)

Examples:
  approval-gate.sh list
  approval-gate.sh show 550e8400-e29b-41d4-a716-446655440000
  approval-gate.sh approve-index 1
  approval-gate.sh auto-approve reminder
  approval-gate.sh watch 10

Logs are written to: $LOG_FILE
EOF
    ;;
esac

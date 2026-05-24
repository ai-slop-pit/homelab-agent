#!/bin/bash
# Agent State Utilities
# Safe, atomic operations on .claude/agent-state.json

set -e

STATE_FILE="/opt/claude-agent/.claude/agent-state.json"
TEMP_DIR="/tmp/agent-state"
mkdir -p "$TEMP_DIR"

# Generate UUID v4
generate_uuid() {
  python3 -c "import uuid; print(str(uuid.uuid4()))"
}

# Get current ISO timestamp
iso_timestamp() {
  python3 -c "from datetime import datetime, timezone; print(datetime.now(timezone.utc).isoformat())"
}

# Read entire agent state
read_state() {
  cat "$STATE_FILE" 2>/dev/null || echo "{}"
}

# Write state atomically (temp file + mv to prevent corruption)
write_state() {
  local state="$1"
  local temp_file="$TEMP_DIR/agent-state.$(date +%s).json"
  echo "$state" > "$temp_file"
  mv "$temp_file" "$STATE_FILE"
}

# Update agent state field
set_agent_state() {
  local new_state="$1"  # idle|busy|sleeping|error
  local state=$(read_state)
  state=$(echo "$state" | python3 -c "import sys, json; d=json.load(sys.stdin); d['agent_state']='$new_state'; d['updated_at']='$(iso_timestamp)'; print(json.dumps(d, indent=2))")
  write_state "$state"
}

# Add task to pending queue
add_task() {
  local source="$1"        # cli|telegram|n8n
  local source_user="$2"   # user ID or 'system'
  local task_type="$3"     # reminder|automation|query|schedule
  local task_desc="$4"     # task description
  local skill="$5"         # skill name
  local approval_req="${6:-false}"  # true|false
  local priority="${7:-normal}"     # low|normal|high

  local task_id=$(generate_uuid)
  local now=$(iso_timestamp)
  local state=$(read_state)

  state=$(python3 - <<'PYTHON' "$state" "$task_id" "$source" "$source_user" "$task_type" "$task_desc" "$priority" "$skill" "$approval_req" "$now"
import sys, json

state = json.loads(sys.argv[1])
new_task = {
    'id': sys.argv[2],
    'source': sys.argv[3],
    'source_user': sys.argv[4],
    'task_type': sys.argv[5],
    'task': sys.argv[6],
    'priority': sys.argv[7],
    'status': 'pending',
    'created_at': sys.argv[10],
    'updated_at': sys.argv[10],
    'skill': sys.argv[8],
    'approval_required': sys.argv[9].lower() == 'true',
    'approved_by': None,
    'approved_at': None,
    'result': None,
    'error': None,
    'retry_count': 0,
    'notify_on_complete': True,
    'notify_channels': [],
    'metadata': {}
}
state['pending_tasks'].append(new_task)
state['updated_at'] = sys.argv[10]
print(json.dumps(state, indent=2))
PYTHON
)

  write_state "$state"
  echo "$task_id"
}

# Get pending tasks
list_pending_tasks() {
  read_state | python3 -c "import sys, json; d=json.load(sys.stdin); print(json.dumps(d.get('pending_tasks', []), indent=2))"
}

# Get completed tasks
list_completed_tasks() {
  read_state | python3 -c "import sys, json; d=json.load(sys.stdin); print(json.dumps(d.get('completed_tasks', []), indent=2))"
}

# Get task by ID
get_task() {
  local task_id="$1"
  read_state | python3 <<PYTHON
import sys, json
d = json.load(sys.stdin)
tasks = d.get('pending_tasks', []) + d.get('completed_tasks', [])
for t in tasks:
  if t['id'] == '$task_id':
    print(json.dumps(t, indent=2))
    exit(0)
print(json.dumps({"error": "Task not found"}, indent=2), file=sys.stderr)
exit(1)
PYTHON
}

# Update task status
update_task_status() {
  local task_id="$1"
  local new_status="$2"  # pending|approved|rejected|executing|completed|failed
  local result="${3:-}"  # optional result message
  local error="${4:-}"   # optional error message

  local state=$(read_state)

  # Move from pending to completed if applicable
  if [[ "$new_status" == "completed" ]] || [[ "$new_status" == "failed" ]]; then
    state=$(echo "$state" | python3 <<PYTHON
import sys, json
d = json.load(sys.stdin)
moved = False
for i, t in enumerate(d.get('pending_tasks', [])):
  if t['id'] == '$task_id':
    t['status'] = '$new_status'
    t['updated_at'] = '$(iso_timestamp)'
    if '$result': t['result'] = '$result'
    if '$error': t['error'] = '$error'
    d['completed_tasks'].append(t)
    d['pending_tasks'].pop(i)
    moved = True
    break
if not moved:
  for t in d.get('completed_tasks', []):
    if t['id'] == '$task_id':
      t['status'] = '$new_status'
      t['updated_at'] = '$(iso_timestamp)'
      if '$result': t['result'] = '$result'
      if '$error': t['error'] = '$error'
      moved = True
      break
d['updated_at'] = '$(iso_timestamp)'
print(json.dumps(d, indent=2))
PYTHON
)
  else
    # Just update status in place
    state=$(echo "$state" | python3 <<PYTHON
import sys, json
d = json.load(sys.stdin)
for t in d.get('pending_tasks', []):
  if t['id'] == '$task_id':
    t['status'] = '$new_status'
    t['updated_at'] = '$(iso_timestamp)'
    if '$result': t['result'] = '$result'
    if '$error': t['error'] = '$error'
    break
d['updated_at'] = '$(iso_timestamp)'
print(json.dumps(d, indent=2))
PYTHON
)
  fi

  write_state "$state"
}

# Approve task
approve_task() {
  local task_id="$1"
  local approved_by="$2"  # user ID

  local state=$(read_state)
  state=$(echo "$state" | python3 <<PYTHON
import sys, json
d = json.load(sys.stdin)
for t in d.get('pending_tasks', []):
  if t['id'] == '$task_id':
    t['status'] = 'approved'
    t['approved_by'] = '$approved_by'
    t['approved_at'] = '$(iso_timestamp)'
    t['updated_at'] = '$(iso_timestamp)'
    break
d['updated_at'] = '$(iso_timestamp)'
print(json.dumps(d, indent=2))
PYTHON
)

  write_state "$state"
}

# Reject task
reject_task() {
  local task_id="$1"
  local rejected_by="$2"  # user ID

  local state=$(read_state)
  state=$(echo "$state" | python3 <<PYTHON
import sys, json
d = json.load(sys.stdin)
for i, t in enumerate(d.get('pending_tasks', [])):
  if t['id'] == '$task_id':
    t['status'] = 'rejected'
    t['updated_at'] = '$(iso_timestamp)'
    d['completed_tasks'].append(t)
    d['pending_tasks'].pop(i)
    break
d['updated_at'] = '$(iso_timestamp)'
print(json.dumps(d, indent=2))
PYTHON
)

  write_state "$state"
}

# Main: allow direct script invocation for utilities
case "${1:-help}" in
  set-state)
    set_agent_state "$2"
    ;;
  add-task)
    add_task "$2" "$3" "$4" "$5" "$6" "$7" "$8"
    ;;
  list-pending)
    list_pending_tasks
    ;;
  list-completed)
    list_completed_tasks
    ;;
  get-task)
    get_task "$2"
    ;;
  update-status)
    update_task_status "$2" "$3" "$4" "$5"
    ;;
  approve)
    approve_task "$2" "$3"
    ;;
  reject)
    reject_task "$2" "$3"
    ;;
  *)
    cat <<EOF
Usage: agent-state-utils.sh <command> [args]

Commands:
  set-state <state>                     Set agent state (idle|busy|sleeping|error)
  add-task <source> <user> <type> <desc> <skill> [approval] [priority]
                                         Add task to pending queue
  list-pending                          List pending tasks
  list-completed                        List completed tasks
  get-task <task-id>                    Get task by ID
  update-status <task-id> <status> [result] [error]
                                         Update task status
  approve <task-id> <approved-by>       Approve a task
  reject <task-id> <rejected-by>        Reject a task

Examples:
  agent-state-utils.sh set-state busy
  agent-state-utils.sh add-task cli user reminder "remind about laundry" reminder-engine false normal
  agent-state-utils.sh list-pending
  agent-state-utils.sh approve 550e8400-e29b-41d4-a716-446655440000 user
EOF
    ;;
esac

#!/usr/bin/env python3
"""Agent State Utilities - Safe operations on .claude/agent-state.json"""

import json
import sys
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

STATE_FILE = Path("/opt/claude-agent/.claude/agent-state.json")
TEMP_DIR = Path("/tmp/agent-state")
TEMP_DIR.mkdir(exist_ok=True)

def iso_timestamp() -> str:
    """Get current ISO timestamp"""
    return datetime.now(timezone.utc).isoformat()

def read_state() -> dict:
    """Read agent state file"""
    if STATE_FILE.exists():
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return {}

def write_state(state: dict) -> None:
    """Write state atomically"""
    temp_file = TEMP_DIR / f"agent-state.{os.getpid()}.json"
    with open(temp_file, 'w') as f:
        json.dump(state, f, indent=2)
    temp_file.replace(STATE_FILE)

def set_agent_state(new_state: str) -> None:
    """Set agent state (idle|busy|sleeping|error)"""
    state = read_state()
    state['agent_state'] = new_state
    state['updated_at'] = iso_timestamp()
    write_state(state)

def add_task(source: str, source_user: str, task_type: str, task_desc: str,
             skill: str, approval_req: bool = False, priority: str = "normal") -> str:
    """Add task to pending queue. Returns task ID."""
    state = read_state()
    task_id = str(uuid.uuid4())
    now = iso_timestamp()

    new_task = {
        'id': task_id,
        'source': source,
        'source_user': source_user,
        'task_type': task_type,
        'task': task_desc,
        'priority': priority,
        'status': 'pending',
        'created_at': now,
        'updated_at': now,
        'skill': skill,
        'approval_required': approval_req,
        'approved_by': None,
        'approved_at': None,
        'result': None,
        'error': None,
        'retry_count': 0,
        'notify_on_complete': True,
        'notify_channels': [],
        'metadata': {}
    }

    if 'pending_tasks' not in state:
        state['pending_tasks'] = []
    state['pending_tasks'].append(new_task)
    state['updated_at'] = now

    write_state(state)
    return task_id

def list_pending_tasks() -> list:
    """List pending tasks"""
    state = read_state()
    return state.get('pending_tasks', [])

def list_completed_tasks() -> list:
    """List completed tasks"""
    state = read_state()
    return state.get('completed_tasks', [])

def get_task(task_id: str) -> Optional[dict]:
    """Get task by ID"""
    state = read_state()
    all_tasks = state.get('pending_tasks', []) + state.get('completed_tasks', [])
    for task in all_tasks:
        if task['id'] == task_id:
            return task
    return None

def update_task_status(task_id: str, new_status: str, result: str = "", error: str = "") -> None:
    """Update task status"""
    state = read_state()

    # Check if moving to completed/failed
    is_completed = new_status in ('completed', 'failed')

    # Find and update task in pending_tasks
    for i, task in enumerate(state.get('pending_tasks', [])):
        if task['id'] == task_id:
            task['status'] = new_status
            task['updated_at'] = iso_timestamp()
            if result:
                task['result'] = result
            if error:
                task['error'] = error

            if is_completed:
                state['completed_tasks'].append(task)
                state['pending_tasks'].pop(i)
            break
    else:
        # Not in pending, check completed
        for task in state.get('completed_tasks', []):
            if task['id'] == task_id:
                task['status'] = new_status
                task['updated_at'] = iso_timestamp()
                if result:
                    task['result'] = result
                if error:
                    task['error'] = error
                break

    state['updated_at'] = iso_timestamp()
    write_state(state)

def approve_task(task_id: str, approved_by: str) -> None:
    """Approve a task"""
    state = read_state()

    for task in state.get('pending_tasks', []):
        if task['id'] == task_id:
            task['status'] = 'approved'
            task['approved_by'] = approved_by
            task['approved_at'] = iso_timestamp()
            task['updated_at'] = iso_timestamp()
            break

    state['updated_at'] = iso_timestamp()
    write_state(state)

def reject_task(task_id: str, rejected_by: str) -> None:
    """Reject a task"""
    state = read_state()

    for i, task in enumerate(state.get('pending_tasks', [])):
        if task['id'] == task_id:
            task['status'] = 'rejected'
            task['updated_at'] = iso_timestamp()
            state['completed_tasks'].append(task)
            state['pending_tasks'].pop(i)
            break

    state['updated_at'] = iso_timestamp()
    write_state(state)

def main():
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    command = sys.argv[1]

    try:
        if command == 'set-state':
            set_agent_state(sys.argv[2])

        elif command == 'add-task':
            approval_req = sys.argv[7].lower() == 'true' if len(sys.argv) > 7 else False
            priority = sys.argv[8] if len(sys.argv) > 8 else 'normal'
            task_id = add_task(sys.argv[2], sys.argv[3], sys.argv[4],
                             sys.argv[5], sys.argv[6], approval_req, priority)
            print(task_id)

        elif command == 'list-pending':
            tasks = list_pending_tasks()
            print(json.dumps(tasks, indent=2))

        elif command == 'list-completed':
            tasks = list_completed_tasks()
            print(json.dumps(tasks, indent=2))

        elif command == 'get-task':
            task = get_task(sys.argv[2])
            if task:
                print(json.dumps(task, indent=2))
            else:
                print(json.dumps({'error': 'Task not found'}, indent=2), file=sys.stderr)
                sys.exit(1)

        elif command == 'update-status':
            task_id = sys.argv[2]
            new_status = sys.argv[3]
            result = sys.argv[4] if len(sys.argv) > 4 else ""
            error = sys.argv[5] if len(sys.argv) > 5 else ""
            update_task_status(task_id, new_status, result, error)

        elif command == 'approve':
            approve_task(sys.argv[2], sys.argv[3])

        elif command == 'reject':
            reject_task(sys.argv[2], sys.argv[3])

        else:
            print_usage()
            sys.exit(1)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

def print_usage():
    usage = """Usage: agent-state-utils.py <command> [args]

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
  agent-state-utils.py set-state busy
  agent-state-utils.py add-task cli user reminder "remind about laundry" reminder-engine false normal
  agent-state-utils.py list-pending
  agent-state-utils.py approve 550e8400-e29b-41d4-a716-446655440000 user
"""
    print(usage)

if __name__ == '__main__':
    main()

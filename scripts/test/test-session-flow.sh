#!/bin/bash
set -e

echo "=== Testing Telegram Bot Session Flow ==="

# Clean up old files
echo "[1/5] Cleaning up old test files..."
cat > /opt/claude-agent/.claude/current-session.json << 'EOF'
{
  "session_id": "sess-test-flow",
  "created_at": "2026-05-24T22:45:00.000Z",
  "messages": []
}
EOF
echo "✅ Session file reset"

# Filter agent-state.json to remove old telegram tasks
echo "[2/5] Cleaning agent state..."
jq '.pending_tasks = [] | .completed_tasks = []' /opt/claude-agent/.claude/agent-state.json > /tmp/agent-clean.json
mv /tmp/agent-clean.json /opt/claude-agent/.claude/agent-state.json
echo "✅ Agent state cleaned"

# Send a test message via webhook
echo "[3/5] Sending test message via webhook..."
sleep 2
TASK_ID=$(curl -s -X POST http://localhost:3000/telegram \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 555,
    "message": {
      "message_id": 55,
      "date": 1234567890,
      "chat": {"id": -1003951507653, "title": "Va Hime"},
      "from": {"id": 8176772709, "first_name": "Audrius"},
      "text": "test: this message should start a session"
    }
  }' && echo "✅ Webhook message sent" && sleep 2

# Check session
echo "[4/5] Checking session..."
SESSION_MSG_COUNT=$(jq '.messages | length' /opt/claude-agent/.claude/current-session.json)
echo "Session has $SESSION_MSG_COUNT messages"

# Check if task was queued
echo "[5/5] Checking queued tasks..."
PENDING_COUNT=$(jq '.pending_tasks | length' /opt/claude-agent/.claude/agent-state.json)
echo "Agent state has $PENDING_COUNT pending tasks"

if [ "$SESSION_MSG_COUNT" -gt 0 ] && [ "$PENDING_COUNT" -gt 0 ]; then
  echo ""
  echo "✅ SUCCESS: Session management is working!"
  echo "   - Message saved to session"
  echo "   - Task queued with conversation history"
else
  echo ""
  echo "❌ ISSUE: Messages not being processed"
  echo "   Session messages: $SESSION_MSG_COUNT (expected: > 0)"
  echo "   Pending tasks: $PENDING_COUNT (expected: > 0)"
fi

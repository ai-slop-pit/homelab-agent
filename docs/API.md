# HTTP API Reference

The agent exposes an HTTP API on port 3000 for integration with external systems (n8n, webhooks, etc.).

## Endpoints

### POST /task

Submit a new task to the queue.

**Request**:
```bash
curl -X POST http://localhost:3000/task \
  -H "Content-Type: application/json" \
  -d '{
    "task": "backup database",
    "taskType": "automation",
    "skill": "n8n-orchestrator"
  }'
```

**Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| task | string | Yes | - | Task description |
| taskType | string | No | automation | Task type: reminder, automation, query, schedule |
| skill | string | No | n8n-orchestrator | Which skill to execute |

**Response** (200 OK):
```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "task required"
}
```

**Notes**:
- HTTP tasks are submitted with `source: "n8n"` and `approval_required: false`
- Task executes on next task-runner cycle (5-10 seconds typical)
- No blocking—returns immediately

**Example** (n8n):
```javascript
// n8n HTTP Request Node
const response = await fetch('http://localhost:3000/task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: 'backup database at {{$now}}',
    taskType: 'automation',
    skill: 'home-automation'
  })
});

const { taskId } = await response.json();
return { taskId };
```

---

### GET /task/:taskId

Query the status of a specific task.

**Request**:
```bash
curl http://localhost:3000/task/550e8400-e29b-41d4-a716-446655440000
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "source": "n8n",
  "source_user": "system",
  "task_type": "automation",
  "task": "backup database",
  "priority": "normal",
  "status": "completed",
  "skill": "n8n-orchestrator",
  "approval_required": false,
  "approved_by": null,
  "result": "Backup completed successfully at 2026-05-24 12:30:00",
  "error": null,
  "created_at": "2026-05-24T12:29:00Z",
  "updated_at": "2026-05-24T12:30:00Z"
}
```

**Response** (404 Not Found):
```json
{
  "error": "Task not found"
}
```

**Status Values**:
- `pending` — Task queued, awaiting execution
- `approved` — Task approved and ready to execute
- `executing` — Task currently running
- `completed` — Task finished successfully
- `failed` — Task failed after max retries

**Examples**:

Check if task is done:
```javascript
const response = await fetch(`http://localhost:3000/task/${taskId}`);
const task = await response.json();

if (task.status === 'completed') {
  console.log('Result:', task.result);
} else if (task.status === 'failed') {
  console.log('Error:', task.error);
} else {
  console.log('Still processing...');
}
```

---

### GET /tasks/pending

List all pending (not yet executed) tasks.

**Request**:
```bash
curl http://localhost:3000/tasks/pending
```

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "task": "backup database",
    "status": "pending",
    "priority": "high",
    "created_at": "2026-05-24T12:00:00Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "task": "reminder about meeting",
    "status": "approved",
    "priority": "normal",
    "created_at": "2026-05-24T12:05:00Z"
  }
]
```

**Filters** (query parameters):
```bash
# By status
curl "http://localhost:3000/tasks/pending?status=approved"

# By source
curl "http://localhost:3000/tasks/pending?source=n8n"

# By priority
curl "http://localhost:3000/tasks/pending?priority=high"
```

---

### GET /status

Get overall agent status.

**Request**:
```bash
curl http://localhost:3000/status
```

**Response** (200 OK):
```json
{
  "agent_state": "idle",
  "pending_tasks": 3,
  "completed_tasks": 45,
  "last_sync": "2026-05-24T12:30:45Z"
}
```

**Agent States**:
- `idle` — No tasks running, ready for new work
- `busy` — Currently executing task(s)
- `sleeping` — Scheduled rest period (don't submit tasks)
- `error` — Last task failed, manual intervention may be needed

---

### GET /health

Health check endpoint (for monitoring/load balancers).

**Request**:
```bash
curl http://localhost:3000/health
```

**Response** (200 OK):
```json
{
  "status": "ok"
}
```

**Response** (503 Service Unavailable):
```json
{
  "status": "error"
}
```

---

## Usage Patterns

### Pattern 1: Submit and Poll

```bash
#!/bin/bash

# Submit task
RESPONSE=$(curl -s -X POST http://localhost:3000/task \
  -H "Content-Type: application/json" \
  -d '{
    "task": "backup database",
    "taskType": "automation"
  }')

TASK_ID=$(echo "$RESPONSE" | jq -r '.taskId')
echo "Submitted: $TASK_ID"

# Poll until done
for i in {1..30}; do
  STATUS=$(curl -s http://localhost:3000/task/$TASK_ID | jq -r '.status')
  echo "Status: $STATUS"
  
  if [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]]; then
    RESULT=$(curl -s http://localhost:3000/task/$TASK_ID | jq -r '.result // .error')
    echo "Done: $RESULT"
    break
  fi
  
  sleep 2
done
```

### Pattern 2: Batch Submit

```bash
#!/bin/bash

# Submit multiple tasks
for db in postgres mysql redis; do
  curl -s -X POST http://localhost:3000/task \
    -H "Content-Type: application/json" \
    -d "{
      \"task\": \"backup $db\",
      \"taskType\": \"automation\"
    }" | jq -r '.taskId' >> /tmp/task_ids.txt
done

# Wait for all to complete
while read TASK_ID; do
  while true; do
    STATUS=$(curl -s http://localhost:3000/task/$TASK_ID | jq -r '.status')
    [[ "$STATUS" == "completed" || "$STATUS" == "failed" ]] && break
    sleep 2
  done
  echo "Completed: $TASK_ID"
done < /tmp/task_ids.txt

echo "All done"
```

### Pattern 3: Webhook from External Service

```javascript
// Express webhook handler (in some external service)
app.post('/webhook/claude-agent', async (req, res) => {
  const { action, data } = req.body;
  
  // Forward to Claude agent
  const response = await fetch('http://192.168.50.112:3000/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: `${action}: ${JSON.stringify(data)}`,
      taskType: 'automation'
    })
  });

  const { taskId } = await response.json();
  
  // Track status in database
  await db.tasks.create({
    taskId,
    source: 'external-webhook',
    action,
    status: 'queued'
  });

  res.json({ taskId, status: 'queued' });
});

// Later, poll for completion
setInterval(async () => {
  const pending = await db.tasks.find({ status: 'queued' });
  
  for (const task of pending) {
    const response = await fetch(`http://192.168.50.112:3000/task/${task.taskId}`);
    const { status, result, error } = await response.json();
    
    await db.tasks.update(task.id, {
      status,
      result: result || error
    });
  }
}, 5000);
```

### Pattern 4: Conditional Execution (n8n)

```
n8n Workflow:
1. Trigger (e.g., daily at 6am)
2. HTTP Request: POST /task
3. Wait for response
4. Poll /task/:taskId every 2s
5. When completed, continue with next node

Example nodes:
- Get time of day
- If (time == 18:00) → POST backup request
- Wait Loop: While (status != completed or failed) wait 2s, refresh status
- If (status == completed) → Log success, Else → Log error
```

---

## Error Handling

### Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 400 | "task required" | Ensure task field is in request body |
| 404 | "Task not found" | Check task ID is correct |
| 500 | Internal server error | Check logs, restart bot if needed |
| Connection refused | Bot not running | Start bot: `npm start` |

### Retry Logic

```bash
# Exponential backoff retry
retry_with_backoff() {
  local url="$1"
  local max_attempts=5
  local attempt=1
  
  while [[ $attempt -le $max_attempts ]]; do
    if curl -f "$url" 2>/dev/null; then
      return 0
    fi
    
    local backoff=$((2 ** (attempt - 1)))
    echo "Attempt $attempt failed, retrying in ${backoff}s..."
    sleep $backoff
    attempt=$((attempt + 1))
  done
  
  return 1
}
```

---

## Rate Limits

Currently no rate limiting, but recommendations:

- **Per client**: Max 100 requests/second
- **Per task**: Max 5 tasks/second submission rate
- **Polling**: Min 2-second poll interval

Implement in nginx/reverse proxy if needed.

---

## Security

### Authentication

Currently **no authentication**. Recommendations:

```javascript
// Add API key check to telegram-bot.js
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### SSL/TLS

For production, use reverse proxy:

```nginx
# nginx config
server {
  listen 443 ssl;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  location / {
    proxy_pass http://localhost:3000;
  }
}
```

### Input Validation

Task descriptions are stored in state file (viewable in JSON). Don't include:
- Passwords
- API keys
- Sensitive personal information

---

## Monitoring

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

AGENT_URL="http://localhost:3000"

# Check health endpoint
if ! curl -f "$AGENT_URL/health" > /dev/null 2>&1; then
  echo "CRITICAL: Agent unreachable"
  exit 2
fi

# Check status
STATUS=$(curl -s "$AGENT_URL/status" | jq -r '.agent_state')
if [[ "$STATUS" == "error" ]]; then
  echo "WARNING: Agent in error state"
  exit 1
fi

# Check pending task count
PENDING=$(curl -s "$AGENT_URL/status" | jq -r '.pending_tasks')
if [[ $PENDING -gt 100 ]]; then
  echo "WARNING: $PENDING pending tasks (backlog)"
  exit 1
fi

echo "OK: Agent healthy"
exit 0
```

### Prometheus Metrics (Optional)

Could add Prometheus endpoint:

```
# GET /metrics

agent_pending_tasks 3
agent_completed_tasks 47
agent_failed_tasks 2
agent_state{state="idle"} 1
http_requests_total{endpoint="/task",method="POST",status="200"} 150
```

---

## Integration Examples

### GitHub Actions Workflow

```yaml
name: Trigger Backup
on:
  schedule:
    - cron: '0 2 * * *'

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Submit backup task
        run: |
          curl -X POST http://192.168.50.112:3000/task \
            -H "Content-Type: application/json" \
            -d '{
              "task": "backup database from ci",
              "taskType": "automation"
            }'
```

### Node.js Client Library

```javascript
// claude-agent-client.js
class ClaudeAgentClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async submitTask(task, taskType = 'automation', skill = 'n8n-orchestrator') {
    const response = await fetch(`${this.baseUrl}/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, taskType, skill })
    });
    return response.json();
  }

  async getTaskStatus(taskId) {
    const response = await fetch(`${this.baseUrl}/task/${taskId}`);
    return response.json();
  }

  async waitForCompletion(taskId, timeout = 300000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const task = await this.getTaskStatus(taskId);
      if (task.status === 'completed' || task.status === 'failed') {
        return task;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Task timeout');
  }
}

module.exports = ClaudeAgentClient;
```

Usage:
```javascript
const ClaudeAgent = require('./claude-agent-client');
const agent = new ClaudeAgent();

const { taskId } = await agent.submitTask('backup database');
const result = await agent.waitForCompletion(taskId);
console.log('Done:', result.result);
```

---

For more details, see [USAGE.md](USAGE.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

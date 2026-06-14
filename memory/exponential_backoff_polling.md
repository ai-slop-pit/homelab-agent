---
name: exponential_backoff_polling
description: Exponential backoff implementation for worker polling to reduce CPU/DB load during idle periods
metadata:
  type: project
---

## Implementation: Exponential Backoff for Worker Polling

**What:** Implemented exponential backoff in worker.js to reduce idle polling overhead while maintaining <1s latency when tasks arrive.

**Why:** Worker was polling database every 10 seconds regardless of queue state, wasting CPU and connections during idle periods. Expected ~60% reduction in CPU/DB load during idle time.

**How to apply:** The pattern (pollState object + calculateBackoffInterval + dynamic setTimeout loop) can be reused in any polling system:

```javascript
const pollState = {
  consecutiveEmpty: 0,
  lastLogTime: Date.now(),
  currentInterval: 10000,
  pollStartTime: Date.now()
}

function calculateBackoffInterval(consecutiveEmpty) {
  if (consecutiveEmpty < 5) return 10000  // 10s initially
  if (consecutiveEmpty < 10) return 30000 // 30s after 5 empties
  return 60000                            // 60s cap after 10 empties
}

async function pollLoop() {
  await poll()
  const newInterval = calculateBackoffInterval(pollState.consecutiveEmpty)
  setTimeout(pollLoop, newInterval)
}
```

**Key details:**
- Track consecutive empty results, not just intervals
- Reset to 10s immediately when task found (pollState.consecutiveEmpty = 0)
- Use setTimeout instead of setInterval for dynamic intervals
- Log state every 60s with metrics (polls executed, tasks found, current interval)
- Metrics: poll_count, tasks_found_count tracked via incrementMetric()

**Backoff thresholds chosen:** 5→30s, 10→60s tuned for task latency expectations. Lower thresholds = more latency-sensitive; adjust if needed.

**Commit:** da8285f - "worker: Implement exponential backoff for polling mechanism"

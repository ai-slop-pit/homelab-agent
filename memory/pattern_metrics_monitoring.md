---
name: pattern_metrics_monitoring
description: Using database metrics table for system health observability
metadata:
  type: reference
  created: 2026-06-14
---

## Pattern: Metrics-Driven Observability

**When to use**: System health tracking (success rates, failure patterns), data-driven decisions about improvements.

**Why it matters**:
- Reflects on system behavior: reflector analyzes failure rates to identify improvement areas
- Non-intrusive: lightweight counters, no overhead
- Persistent: metrics survive restarts, trends visible over time
- Queryable: SQL makes it easy to slice by time window, type, status
- Task #20 enabled reflector to identify failure patterns and propose fixes

**Schema**:
CREATE TABLE metrics (
  key TEXT PRIMARY KEY,
  value INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

**Helper functions** (in worker.js):
getMetric(key) → returns current counter value
setMetric(key, value) → sets counter to value
incrementMetric(key, delta=1) → increments counter by delta
getMetrics() → returns all metrics as object

**Current metrics tracked**:
- tasks_completed — successful task implementations
- tasks_failed — failed tasks
- (Can extend: poll_cycles, reflector_runs, api_errors, etc.)

**How reflector uses it** (task #20):
1. Analyzes recent activity (last 7 days): task counts by type/status
2. Queries failure table: failed tasks in last 7 days
3. Uses counts in improvement proposals: "5 failures last week, add better error handling for X"
4. Suggests monitoring improvements: "Track tasks_recovered to catch stuck tasks"

**Where to add metrics**:
- Increment counter on success/failure of critical operations
- Use wrapping functions to ensure try-catch doesn't lose updates
- Example: task implementation wraps in try → incrementMetric('tasks_completed') or ('tasks_failed')
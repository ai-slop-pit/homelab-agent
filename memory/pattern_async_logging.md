---
name: pattern_async_logging
description: Async non-blocking logger with buffering and batch writes
metadata:
  type: reference
  created: 2026-06-14
---

## Pattern: Async Non-Blocking Logging

**When to use**: High-volume logging, where I/O latency could block main event loop (background workers, long-running processes).

**Why it matters**:
- Prevents logging from blocking task execution
- Batch writes are more efficient than sync writes
- Graceful shutdown ensures logs aren't lost on exit
- Task #16 replaced blocking fs.appendFileSync with AsyncLogger across all modules

**Design**:

**Buffer + Timer + Size threshold**:
- Messages accumulate in memory buffer
- Flush on time interval (100ms) OR when buffer exceeds size (4096 bytes)
- Whichever comes first
- Prevents unbounded memory usage and ensures timely writes

**Non-blocking async flush**:
fs.promises.appendFile() → non-blocking, returns immediately
.catch(err => console.error) → handles I/O failures gracefully
.finally() → resets flushing flag

**Exit handler**:
process.on('exit', () => this.flushSync())
- Ensures logs on exit are written to disk (sync, blocking is OK on exit)
- Prevents log loss on SIGTERM/SIGKILL

**Usage** (task #16):
const logger = new AsyncLogger('/path/to/log.log')
logger.log('message') → goes to buffer + console
logger.flush() → writes buffer to disk asynchronously
logger.close() → marks logger as closed, sync flush on exit

**Current usage**:
- worker.js: WORKER_LOG = 'worker.log'
- bot.js: BOT_LOG = 'telegram-bot.log'
- reflector.js: REFLECTOR_LOG = 'reflector.log'
- All use: const logger = new AsyncLogger(path)

**Tuning parameters**:
- flushInterval (ms): 100 = flush every 100ms, good for ~10 msgs/sec
- bufferSize (bytes): 4096 = flush when buffer hits 4KB
- Increase if logging more frequently, decrease if memory-constrained

**Feedback**: Never use fs.appendFileSync in async code. Always use AsyncLogger or fs.promises.
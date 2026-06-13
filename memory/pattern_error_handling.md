---
name: pattern_error_handling
description: Multi-layer error handling strategy for async systems
metadata:
  type: reference
  created: 2026-06-14
---

## Pattern: Multi-Layer Error Handling

**When to use**: Async operations with external dependencies (API calls, database) where failures are user-visible or system-critical.

**Why it matters**:
- Prevents silent failures (unhandled rejections crash without logging)
- Ensures graceful degradation (user gets feedback, not hung interface)
- Separates concerns: specific errors get targeted recovery, unexpected errors get logged
- Task #18 prevented Telegram bot crashes from API failures

**Three-layer design**:

1. **Local try-catch** (specific operations)
   - Wrap critical Telegram API calls: ctx.editMessageReplyMarkup(), ctx.reply(), ctx.answerCbQuery()
   - Provide user-visible error message ("Failed to update. Retry manually.")
   - Log with context (task ID, operation type)
   - Example: bot.js approve handler tries edit, catch sends fallback message

2. **Global unhandledRejection handler** (escape hatch)
   - process.on('unhandledRejection', (reason, promise) => { log() })
   - Catches promises that escaped local try-catch
   - Logs to file for debugging
   - Should be in every long-running process (worker.js, bot.js, reflector.js)

3. **Timeout + recovery** (stuck operations)
   - recoverStuck() in worker.js: moves stuck planning tasks back to backlog after 10 min
   - Prevents tasks from hanging forever
   - Runs on each poll cycle

**From task #18**: 
- bot.js wrapped approve/reject/text handlers in try-catch
- Added global handler for edge cases
- Worker.js already had poll() try-catch, added global handler
- Result: no silent crashes, all errors visible in logs, user gets feedback

**When NOT to use try-catch**: 
- Recoverable transient errors (retry in caller)
- Operations that can't fail (internal consistency checks)
- Streams/event emitters (handle 'error' event instead)
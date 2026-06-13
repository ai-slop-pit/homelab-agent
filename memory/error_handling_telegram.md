---
name: error_handling_telegram
description: Error handling for Telegram API failures in bot.js and worker.js to prevent silent crashes
metadata:
  type: project
---

## Telegram API Error Handling Implementation

**Status**: Completed 2026-06-13

### Problem
Bot handlers at lines 79-127 in bot.js (approve/reject callbacks, text messages) didn't catch rejection errors. If `ctx.editMessageReplyMarkup()` or `ctx.reply()` failed, promise rejections could crash the bot silently if not globally caught.

### Solution Implemented

**bot.js** (`/opt/claude-agent/channels/telegram/bot.js`):
- Wrapped `approve_(\d+)` action handler in try-catch (lines 81-94)
  - Catches failures from `ctx.answerCbQuery()`, `ctx.editMessageReplyMarkup()`, `ctx.reply()`
  - Responds with: "Failed to update. Retry manually."
- Wrapped `reject_(\d+)` action handler in try-catch (lines 98-108)
  - Same protection for revision requests
- Wrapped `text` handler in try-catch (lines 112-142)
  - Protects database inserts and message sends
  - Responds with: "Failed to process message. Retry manually."
- Added global `process.on('unhandledRejection')` handler (lines 147-149)
  - Catches any promise rejections escaping local handlers
  - Logs to telegram-bot.log for debugging

**worker.js** (`/opt/claude-agent/worker/worker.js`):
- Wrapped main `poll()` function in try-catch (lines 268-292)
  - Protects database queries and task dispatch
- Added global `process.on('unhandledRejection')` handler (lines 295-297)
  - Catches rejections from async polling loop
  - Logs to worker.log

### Key Design Decisions

**Why**:
- Transient Telegram API failures (network, rate limits, timeouts) should not crash the bot
- Global handler catches edge cases where local try-catch is missed
- Graceful failure messages keep user informed instead of silent hangs

**How to test**:
- Kill Telegram API mid-request: `(timeout 0.1 curl ...; killall -9 curl)`
- Bot should log error and send user-visible recovery message
- Check logs: `grep 'ERROR\|UNHANDLED' logs/telegram-bot.log logs/worker.log`

### Notes
- Existing handlers already had some try-catch for `editMessageReplyMarkup` but not for Telegram API calls
- RateLimiter wraps API calls, so may need testing under rate-limit conditions
- AsyncLogger batches writes, so errors are queued and not lost

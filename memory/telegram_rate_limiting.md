---
name: telegram_rate_limiting
description: Rate limiting system for Telegram API calls to prevent API rejections under load
metadata:
  type: project
---

# Telegram Rate Limiting Implementation

**Status**: Implemented 2026-06-13

## Problem

Under high task volume, worker.js could generate many rapid Telegram API calls (sendMsg, createTopic, etc.), hitting:
- **Global limit**: ~30 msgs/sec per chat (stricter for groups)
- **Telegram 429 errors**: Too Many Requests responses

This caused API rejections and message delivery failures.

## Solution

**Token bucket rate limiter** (`/opt/claude-agent/lib/rateLimit.js`):

### Architecture

- **Global limiter**: 20 msgs/sec across all chats (conservative vs. 30-msg limit)
- **Per-chat limiter**: 5 msgs/sec per individual chat (prevents one chat from drowning others)
- **Burst buffer**: 1.5x multiplier allows brief spikes (30 tokens for global, 12 for per-chat)
- **Queue processor**: Async queue that respects both limits before executing

### Features

1. **Graceful queueing**: All Telegram functions enqueue requests; rate limiter serializes them
2. **Per-chat tracking**: GroupID gets its own limiter, different chat_ids track separately
3. **429 backoff**: On rate limit response (error_code 429), honors `retry_after` and re-queues
4. **Throttled logging**: Logs at most every 5s to avoid log spam

### Integration

**File**: `/opt/claude-agent/worker/worker.js`

All Telegram functions now wrap requests with rate limiter:
```javascript
const rateLimiter = new RateLimiter()

async function sendMsg(chatId, text, opts) {
  const res = await rateLimiter.enqueue(
    () => tgPost('/sendMessage', {...}),
    chatId  // per-chat tracking
  )
  return res && res.result ? res.result.message_id : null
}
```

Wrapped functions:
- `sendMsg()` — most messages
- `deleteMsg()` — cleanup
- `sendTyping()` — typing indicators
- `createTopic()` — forum topics
- `closeTopic()` — topic closure

### Testing

Test script: `/opt/claude-agent/test-rate-limit.js`
- Simulates 50 rapid messages across 3 chats
- Verifies throughput: should be ~20 msgs/sec (queue-enforced)
- Confirms spreading over time, not bursty

Expected benefit: No more API rejections, graceful degradation under load.

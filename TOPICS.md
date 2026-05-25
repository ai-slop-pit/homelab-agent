# Topic Management Guide

The bot automatically creates and manages Telegram forum topics for agent proposals.

## Quick Start

### Create System Proposals Topic (from CLI)
```bash
node create-topic.js "system-proposals"
```

Or in Telegram group (owner only):
```
/createtopics
```

This creates the single `system-proposals` topic where all proposals are sent.

## How It Works

### Single Topic System
All agent proposals go to one central topic:
- **`system-proposals`** — All agent proposals (skills, automations, system improvements, learnings)

### Batch Processing
- Proposals are collected in a batch
- Every 5 minutes (or on demand), they're sent to `system-proposals`
- Each batch includes approval/rejection buttons
- User can approve/reject per proposal

### Topic IDs
All created topics are saved in `.claude/telegram-config.json` with their IDs for future reference.

## Admin Commands

| Command | Purpose |
|---|---|
| `/createtopics` | Create system-proposals topic |
| `/listtopics` | View all configured topics |
| `/addtopic <name>` | Create a custom topic |
| `/batch` | Check batch status |
| `/flushbatch` | Force send pending proposals immediately |

## Configuration File

Topic mappings are stored in:
```json
.claude/telegram-config.json → topics
```

Example:
```json
{
  "topics": {
    "system-proposals": {
      "id": 3,
      "group_id": -1003951507653,
      "created_at": "2026-05-25T12:00:00.000Z",
      "description": "Agent system proposals"
    }
  }
}
```

## Bot Architecture

### Files Involved
- `telegram-bot.js` — Main bot with topic commands
- `topic-manager.js` — Topic creation & routing logic
- `telegram-batch-handler.js` — Batch sending with topic routing
- `create-topic.js` — CLI tool to create topics from command line

### TopicManager Class
```javascript
const { TopicManager } = require('./topic-manager');
const tm = new TopicManager();

// Create a topic
await tm.createTopic(bot, groupId, 'system-proposals', 'description');

// Get topic ID
const topicId = tm.getTopicId('system-proposals');

// Get routing info (always routes to system-proposals)
const routing = tm.getRoutingInfo('skill');
// Returns: { topicName: 'system-proposals', topicId, messageThreadId }
```

## Usage

1. **Create the topic**: `node create-topic.js "system-proposals"`
2. **Verify**: `node create-topic.js` (shows all topics in config)
3. **Agent automatically routes** all proposals to this single topic
4. **Approve/reject** proposals in the Telegram group

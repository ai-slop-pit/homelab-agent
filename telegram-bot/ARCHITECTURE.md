# Telegram Bot Architecture

## Overview
The Telegram bot is a standalone service that provides real-time chat with Claude through Telegram, with persistent conversation context.

## Directory Structure

```
/opt/claude-agent/telegram-bot/
├── src/
│   ├── bot.js                     # Main bot application
│   ├── agent-propose.js           # Proposal handling (from main agent)
│   ├── telegram-batch-handler.js  # Batch operations (from main agent)
│   └── skill-creator.js           # Skill creation (from main agent)
├── config/
│   └── groups.json                # Group and user permissions
├── sessions/
│   └── current-session.json       # Active conversation history
├── logs/
│   └── bot.log                   # Bot activity log
├── node_modules/                  # Dependencies
├── .env                           # Environment variables
├── package.json                   # Node.js dependencies
├── start.sh                       # Startup script
├── README.md                      # Quick reference
├── SETUP.md                       # Installation guide
└── ARCHITECTURE.md               # This file
```

## How It Works

### 1. Message Flow
```
Telegram User
    ↓
    ↓ (Telegram API)
    ↓
Bot (Telegraf)
    ↓
    ├─→ Load/Create Session
    ├─→ Save User Message
    ├─→ Call Claude (local CLI)
    ├─→ Save Response to Session
    └─→ Send Response to Telegram
```

### 2. Session Management
- **Location**: `sessions/current-session.json`
- **Lifecycle**:
  - Created on first message
  - Persists across bot restarts
  - Cleared with `/reset` command
  - Contains conversation history with timestamps

### 3. Claude Integration
- **Method**: Subprocess call to `claude` CLI
- **Context**: Full conversation history passed
- **Response**: Parsed from CLI output
- **Timeout**: 30 seconds

### 4. Configuration
- **File**: `config/groups.json`
- **Manages**:
  - Group IDs and names
  - Owner/approver permissions
  - Active/inactive status
  - User roles

## Key Components

### Core Functions

#### Session Management
```javascript
loadSession()           // Load current conversation
saveSession(session)    // Persist session to disk
createNewSession()      // Create new session
addMessageToSession()   // Add message with timestamp
```

#### Claude Integration
```javascript
callClaude(message, history)  // Call Claude with context
```

#### Message Handling
```javascript
bot.on('text')   // Handle text messages
bot.command()    // Handle /commands
```

### Middleware

- **Logger**: Logs all messages and operations
- **Security**: Checks GROUP_ID and user authorization
- **Universal**: Passes all updates through bot.handleUpdate()

### Commands

| Command | Function |
|---------|----------|
| `/reset` | Clear conversation, start fresh |
| `/show` | Display last 10 messages |
| `/status` | Show bot and task status |
| `/batch` | Show proposal batch status |

## External Dependencies

The bot integrates with:

1. **Main Agent** (`/opt/claude-agent/`)
   - `agent-state.json` - Task queue (optional)
   - `agent-propose.js` - Proposal handling
   - `telegram-batch-handler.js` - Batch operations
   - `skill-creator.js` - Skill creation

2. **Claude CLI** 
   - Local executable: `claude`
   - Used for direct API calls

3. **Telegram API**
   - Bot token from environment
   - Polling/webhook updates

## Environment Variables

Required in `.env`:
```
BOT_TOKEN=your_telegram_token
GROUP_ID=-1003951507653
OWNER_ID=8176772709
CHAT_ID=-1003951507653 (fallback for GROUP_ID)
WIFE_ID=8176772709
```

## Performance Considerations

- **Memory**: ~65-70MB per instance
- **Response Time**: 2-5 seconds (depends on Claude)
- **Session Size**: Unlimited (limited by disk)
- **Concurrent Users**: Supports 1 active session at a time

## Error Handling

- **Missing Claude**: Returns error message
- **Telegram API Error**: Logs and continues
- **Session Issues**: Auto-creates fresh session
- **Authorization Failed**: Silently ignores message

## Logging

Location: `logs/bot.log`

Log levels:
- `[CONFIG]` - Configuration loading
- `[RECV]` - Received messages
- `[AUTH]` - Authorization checks
- `[TEXT]` - Text handler execution
- `[SESSION]` - Session operations
- `[CLAUDE]` - Claude API calls
- `[WEBHOOK]` - HTTP webhook activity

## Future Enhancements

- [ ] Multiple concurrent sessions per group
- [ ] Session history browser (`/sessions`)
- [ ] Token usage tracking
- [ ] Conversation export
- [ ] Custom system prompts per group
- [ ] Auto-moderation
- [ ] Analytics dashboard

## Troubleshooting

### Bot not starting
```bash
# Check logs
tail -f logs/bot.log

# Check syntax
node -c src/bot.js

# Check dependencies
npm install
```

### Bot not responding
1. Verify BOT_TOKEN is correct
2. Check GROUP_ID matches your group
3. Ensure user is in owners/approvers
4. Check Claude CLI is accessible: `which claude`

### Port conflicts (3000)
```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

## Integration with Main Agent

The bot operates independently but can queue tasks to the main agent:

```javascript
// Optional task queueing (not used in current version)
const taskId = addTaskToQueue(
  'telegram',
  userName,
  'query',
  message,
  'research',
  false,  // approval required
  'high', // priority
  ['telegram'],
  conversationHistory
);
```

Current version uses direct Claude responses without agent queueing.

# Telegram Bot Setup Guide

## Quick Start

```bash
cd /opt/claude-agent/telegram-bot
./start.sh
```

## Installation

### 1. Requirements
- Node.js 14+
- npm or yarn

### 2. Environment Setup
Create or update `.env` file with:
```
BOT_TOKEN=your_telegram_bot_token
GROUP_ID=-1003951507653
OWNER_ID=8176772709
CHAT_ID=-1003951507653
WIFE_ID=8176772709
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Groups
Edit `config/groups.json`:
```json
{
  "groups": [
    {
      "id": -1003951507653,
      "name": "Va Hime",
      "owners": [8176772709],
      "approvers": [8176772709],
      "type": "forum",
      "active": true
    }
  ],
  "users": {
    "8176772709": {
      "name": "Audrius",
      "role": "admin",
      "permissions": ["owner", "approver"]
    }
  },
  "settings": {
    "defaultApprovalRequired": false,
    "logLevel": "info"
  }
}
```

## Running the Bot

### Development Mode
```bash
cd /opt/claude-agent/telegram-bot
node src/bot.js
```

### Production Mode
```bash
cd /opt/claude-agent/telegram-bot
./start.sh
```

### Monitoring Logs
```bash
tail -f logs/bot.log
```

## Features

### Chat Interface
- Send messages to get immediate Claude responses
- Full conversation context is maintained
- Sessions persist across restarts

### Commands
- `/reset` - Clear conversation history and start fresh
- `/show` - Display last 10 messages from current session

### Configuration
- Multi-group support
- User permissions (owners, approvers)
- Conversation session management
- Error handling and logging

## Architecture

```
telegram-bot/
├── src/
│   └── bot.js                 # Main bot application
├── config/
│   └── groups.json            # Group and user configuration
├── sessions/
│   └── current-session.json   # Active conversation history
├── logs/
│   └── bot.log               # Bot activity logs
├── .env                       # Environment variables
├── start.sh                   # Startup script
├── package.json              # Dependencies
├── README.md                 # Quick reference
└── SETUP.md                  # This file
```

## Troubleshooting

### Bot not responding
1. Check logs: `tail logs/bot.log`
2. Verify BOT_TOKEN in `.env`
3. Ensure GROUP_ID matches your Telegram group
4. Check if bot is actually running: `ps aux | grep "node.*bot.js"`

### Port conflicts
The bot uses port 3000 for HTTP webhooks. If port 3000 is in use:
- Find process: `lsof -i :3000`
- Or change port in bot.js

### Session issues
- Clear session: `rm sessions/current-session.json`
- Bot will auto-create fresh session on next message

## Integration with Main Agent

The telegram-bot is a separate service but integrates with the main agent:
- Tasks can be queued to `/opt/claude-agent/.claude/agent-state.json`
- Conversation context is maintained independently
- Logs are separate: `logs/bot.log` vs main agent logs

## Security

- Owner and approver roles managed in `config/groups.json`
- Only authorized users can interact with the bot
- Commands are whitelisted (/reset, /show)
- Dangerous operations require approval

## Support

For issues or improvements, check the main agent documentation.

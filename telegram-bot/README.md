# Telegram Bot - Claude Home Assistant

Real-time chat with Claude through Telegram with persistent conversation context.

## Structure

```
telegram-bot/
├── src/
│   └── bot.js           # Main bot code
├── config/
│   └── groups.json      # Group configuration
├── sessions/            # Conversation session storage
├── logs/               # Bot logs
├── .env                # Environment variables (BOT_TOKEN, etc.)
├── start.sh            # Startup script
└── README.md           # This file
```

## Usage

### Start the Bot
```bash
./start.sh
```

### Configuration
Edit `config/groups.json` to manage groups and users:
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
  ]
}
```

### Commands
- `/reset` - Clear conversation history
- `/show` - Display last 10 messages

## Features

- ✅ Real-time responses from Claude
- ✅ Conversation context maintained across messages
- ✅ Session persistence
- ✅ Multi-group support with permissions
- ✅ Typing indicators
- ✅ Error handling and logging

## Logs
Check bot activity in `logs/bot.log`

## Sessions
Conversation history stored in `sessions/current-session.json`

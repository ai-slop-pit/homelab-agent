# Telegram Group Setup Guide

## Step 1: Create a Telegram Bot (BotFather)

1. Open Telegram and search for `@BotFather`
2. Start a chat and send `/newbot`
3. Choose a name (e.g., "CT-112-Agent")
4. Choose a username (e.g., "ct112_agent_bot")
5. **Copy the API token** — you'll need this

Example token: `123456789:ABCdefGHIjklmnoPQRstuvwxyz`

## Step 2: Create a Telegram Group

1. In Telegram, create a new group
2. Give it a name (e.g., "CT 112 Control")
3. Add the bot to the group (search by username: `@ct112_agent_bot`)
4. Make the bot an **admin** (right-click bot → make admin)

## Step 3: Get Your Group ID

Run this command to find your group ID:

```bash
curl -s "https://api.telegram.org/bot{BOT_TOKEN}/getUpdates" | jq '.result[].message.chat.id'
```

Or:
1. Send a message in the group
2. Run the command above
3. Look for a negative number (e.g., `-1003951507653`)

**Save this** — it's your `GROUP_ID`

## Step 4: Configure Environment Variables

```bash
export BOT_TOKEN="123456789:ABCdefGHIjklmnoPQRstuvwxyz"
export GROUP_ID="-1003951507653"
export OWNER_ID="your-telegram-user-id"  # Optional: for auth
export WIFE_ID="her-telegram-user-id"    # Optional: for approvals
```

To find your user ID:
1. Send `/chatid` to the bot in a DM
2. It will reply with your user ID

## Step 5: Start the Telegram Bot

```bash
BOT_TOKEN="..." GROUP_ID="..." node telegram-bot.js
```

The bot will start listening for messages and button clicks.

## Step 6: Initialize Group Structure

Send `/setup` in the group:
```
/setup
```

The bot will create forum topics:
- `homelab` — System and infrastructure
- `general` — General discussion
- `media` — Media server, torrents, etc.
- `dev` — Development and agent

## Step 7: Test the Bot

Try these commands in the group:

```
/status          — Show agent status
/batch           — View proposal batch status
/flushbatch      — Send pending proposals now
/tasks           — List recent tasks
/chatid          — Debug: show chat/user IDs
```

## Step 8: Configure Approvals (Optional)

If you want your wife (or someone else) to approve agent actions:

```bash
export WIFE_ID="her-user-id"
```

Now she can approve proposals with the ✅ button, and you'll both be notified.

## Testing the Full Flow

Once the bot is running:

1. **Check status**:
   ```
   /status
   ```

2. **Run agent learning cycle** (in another terminal):
   ```bash
   BOT_TOKEN="..." GROUP_ID="..." node agent-manager.js
   ```

3. **Watch Telegram** — You'll see:
   - Batch of proposals appear (if any)
   - Click ✅ to approve
   - Skills auto-create
   - Performance tracked

## Troubleshooting

### Bot doesn't respond
- Check `BOT_TOKEN` is valid
- Check bot is admin in group
- Check `GROUP_ID` is correct

### Can't get group ID
- Send a message in the group first
- Make sure bot is in the group
- Try `curl` command again

### Commands not working
- Make sure bot is admin
- Check spelling of commands
- Try `/chatid` to verify bot is receiving messages

## Environment Variables

```bash
# Required
BOT_TOKEN           # From BotFather
GROUP_ID            # Your group's ID (negative number)

# Optional (for auth)
OWNER_ID            # Your user ID (for owner-only commands)
WIFE_ID             # Spouse/collaborator user ID (for approvals)
CHAT_ID             # Alternative to OWNER_ID

# Optional (for other features)
DEBUG               # Set to "true" for verbose logging
```

## Permanent Setup (Recommended)

Add to a `.env` file or shell profile:

```bash
# ~/.bashrc or ~/.zshrc
export BOT_TOKEN="your-token-here"
export GROUP_ID="your-group-id-here"
export OWNER_ID="your-id-here"
export WIFE_ID="her-id-here"

alias start-bot="cd /opt/claude-agent && node telegram-bot.js"
```

Then start bot anytime with:
```bash
start-bot
```

## What Happens When Bot Runs

1. **Listens** for messages in the group
2. **Queues** tasks from text messages
3. **Watches** for proposal approvals (✅/❌ buttons)
4. **Auto-creates** skills when proposals are approved
5. **Reports** status on `/status`, `/batch`, `/tasks`

The bot stays running in the background, listening for:
- Incoming messages (add to task queue)
- Button clicks (approve/reject)
- Commands (`/status`, `/batch`, etc.)

## Full System In Action

```
Terminal 1: Start the bot
$ start-bot
CT-112-Agent listening on group...

Terminal 2: Run learning cycle
$ BOT_TOKEN="..." GROUP_ID="..." node agent-manager.js
Detecting patterns... Proposing skills...

Telegram: You see batch proposals
You: Click ✅ Approve

System: Auto-creates skill, monitors performance
Next cycle: Evaluates if skill worked
```

That's it! Your agent system is now connected to Telegram.

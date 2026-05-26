# Telegram Group Setup Checklist

## 🤖 Step 1: Create Bot Token
- [ ] Message `@BotFather` on Telegram
- [ ] Send `/newbot`
- [ ] Choose bot name
- [ ] Choose bot username
- [ ] **Save bot token** (long string like `123456:ABC...`)

## 👥 Step 2: Create Group
- [ ] Create new Telegram group (e.g., "CT 112 Control")
- [ ] Add your bot to the group by username
- [ ] Make bot an **admin** (right-click → Make Admin)

## 🆔 Step 3: Get Group ID
Run this command:
```bash
curl -s "https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getUpdates" | jq '.result[].message.chat.id'
```
- [ ] Replace `{YOUR_BOT_TOKEN}` with actual token
- [ ] Send a test message in the group first
- [ ] Run command and save the **negative number** (e.g., `-1003951507653`)

## 🔑 Step 4: Get Your User ID
Send `/chatid` to the bot in a DM:
- [ ] Open DM with your bot
- [ ] Send `/chatid`
- [ ] Bot replies with your user ID (6-10 digit number)
- [ ] Save this as `OWNER_ID`

## 📝 Step 5: Set Environment Variables
Create/update shell profile (`~/.bashrc` or `~/.zshrc`):

```bash
export BOT_TOKEN="your-token-here"
export GROUP_ID="your-group-id-here"
export OWNER_ID="your-user-id-here"
```

Then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

- [ ] Set `BOT_TOKEN`
- [ ] Set `GROUP_ID`
- [ ] Set `OWNER_ID`
- [ ] Verify with `echo $BOT_TOKEN`

## 🚀 Step 6: Start the Bot
```bash
cd /opt/claude-agent
node telegram-bot.js
```

- [ ] Bot starts without errors
- [ ] Bot should be online in the Telegram group

## ⚙️ Step 7: Initialize Group Structure
In the Telegram group, send:
```
/setup
```

- [ ] Bot responds with "Setting up group topics..."
- [ ] Topics created: homelab, general, media, dev

## ✅ Step 8: Test Commands
Try these in the group:

```
/status           → Shows agent status
/chatid           → Shows group and user IDs
/batch            → Shows proposal batch queue
/tasks            → Shows recent tasks
```

- [ ] `/status` works
- [ ] `/batch` shows queue info
- [ ] `/tasks` lists recent tasks

## 🎯 Step 9: Test Full Integration
Run in another terminal:
```bash
BOT_TOKEN="$BOT_TOKEN" GROUP_ID="$GROUP_ID" node agent-manager.js
```

Watch the Telegram group:
- [ ] Agent messages appear
- [ ] Proposals are queued
- [ ] You can click ✅/❌ buttons
- [ ] Skills auto-create on approval

## 📊 All Done!
- [ ] Bot running and responding
- [ ] Group configured with topics
- [ ] Commands working
- [ ] Integration tested
- [ ] Ready for autonomous evolution!

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Bot doesn't respond | Check `BOT_TOKEN` is valid, bot is admin |
| Can't find group ID | Send message in group first, try curl again |
| `/setup` fails | Make sure bot is admin in the group |
| Commands not working | Bot needs to be admin, check `/chatid` works |
| Telegram API error | Verify `BOT_TOKEN` is correct (no extra spaces) |

## Quick Reference

```bash
# Start bot
node telegram-bot.js

# Run learning cycle
node agent-manager.js

# Check batch status
# Send /batch in Telegram

# Manually flush batch
# Send /flushbatch in Telegram

# View agent state
cat state/agent-state.json

# View proposals
cat .claude/proposals.json
```

---

**Once complete, your agent will:**
1. Learn from tasks
2. Propose improvements (batched to Telegram)
3. Get your approval (you click ✅)
4. Auto-create skills
5. Monitor effectiveness
6. Improve over time

🎉 Autonomous system ready!

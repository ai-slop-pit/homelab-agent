# Agent Autonomy & Self-Improvement System

## Your Telegram Group as Agent Identity

The agent can now propose improvements, new skills, and autonomous actions to your Telegram group. This is the approval gateway for self-evolution.

## How It Works

### 1. Agent Proposes (via agent-propose.js)
When the agent wants to create a new skill or improvement:

```bash
BOT_TOKEN="..." GROUP_ID="..." node -e "
const propose = require('./agent-propose.js');
(async () => {
  await propose.proposeSkill(
    'skill-name',
    'Description of what it does',
    'Why the agent thinks this is needed',
    'High/Medium/Low'  // estimated value
  );
})();
"
```

### 2. You Approve/Reject via Telegram
- Bot sends proposal with **✅ Approve** / **❌ Reject** buttons
- Click to approve or reject
- Agent reads approval status and proceeds

### 3. Approved Proposals Execute
If approved, the agent:
- Creates the new skill in `.claude/skills/<skill-name>/`
- Writes SKILL.md, README.md, code
- Updates `.learnings/MEMORY.md`
- Starts using the new capability

## Proposal Types

### Skills
New autonomous capabilities the agent wants to build:
```
proposeSkill(name, description, why, estimatedValue)
```

### Improvements
Changes to existing systems:
```
proposeImprovement(title, description, impact)
```

## Current Integration

✅ **Telegram Bot**: Listens for proposals, handles approvals
✅ **Proposal System**: Send proposals with inline approval buttons
✅ **Agent Learning**: Pattern analysis, triggers proposals autonomously

## Commands Available

### From Telegram Group:
- `/chatid` - Get group/user IDs
- `/status` - Check agent status
- `/tasks` - List pending tasks
- `/setup` - Create forum topics (homelab, general, media, dev)

### From Claude Code CLI:
```bash
tg "message here"  # Send message to group
```

## Next Steps to Enable Full Autonomy

1. **Enable Internet Context** - Agent checks web for inspiration
2. **Scheduled Learning** - Agent runs learning loop every 6 hours
3. **Automatic Proposals** - Agent autonomously detects patterns and proposes skills
4. **Rate Limiting** - Prevent spam, group approvals into batches
5. **Skill Performance Tracking** - Measure effectiveness of created skills

## Architecture

```
Agent (Claude Code CLI)
  │
  ├─→ Detects pattern in tasks/memory
  │
  ├─→ Proposes skill via agent-propose.js
  │
  ├─→ Sends to Telegram Group (agent-state.json stores proposal)
  │
  └─→ Waits for approval
       │
       ├─→ ✅ Approve → Execute skill creation
       │
       └─→ ❌ Reject → Log rejection, try different approach
```

## Files

- `agent-propose.js` - Proposal system (send + track proposals)
- `agent-learn.js` - Learning engine (analyze patterns, propose skills)
- `telegram-bot.js` - Main bot (handle approvals)
- `.claude/proposals.json` - Proposal history
- `.learnings/MEMORY.md` - Agent memory & patterns

## Examples

### Proposing a New Skill

When agent detects pattern (e.g., you asked about app health 3x):
```javascript
await proposeSkill(
  'app-health-monitor',
  'Autonomous monitoring for application failures',
  'Detected 3+ app-health tasks this month; suggests pattern',
  'High'
)
```

### The Agent Learns By Doing

Month 1: You ask agent to check torrent
Month 2: Agent notices pattern → proposes monitoring skill
Month 3: Agent uses new skill proactively before you ask

## Enabling Internet-Based Inspiration

Add this to make agent check web for ideas:

```bash
# In agent-learn.js, replace mock searchInternet with real call
const result = spawnSync('gemini', ['search', query]);
```

This lets agent find:
- New tools in your domain
- Best practices updates
- Inspiration for optimizations

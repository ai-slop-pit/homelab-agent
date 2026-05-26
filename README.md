# Claude Home Agent — CT 112

Simple message listener that learns by working.

**Architecture**:
```
Telegram → bot.js → spawn 'claude --message' → response
```

## Quick Start

```bash
# Start the bot
BOT_TOKEN=<your-token> node channels/telegram/bot.js
```

The bot listens for messages, processes them with Claude Code, and sends responses back.

## What It Does

- **Listen** for Telegram messages
- **Process** each message via Claude CLI
- **Respond** with results
- **Learn** patterns through memory and skills

No state management. No approval gates. No batch processing. Stateless and simple.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Core philosophy: learning loop & operating principles
- **[SOUL.md](SOUL.md)** — Agent personality & communication style
- **[SKILLS.md](SKILLS.md)** — How skills evolve through work
- **[INFRASTRUCTURE.md](INFRASTRUCTURE.md)** — Home lab reference (Proxmox, containers)

## Structure

```
/opt/claude-agent/
├── channels/telegram/    # Telegram bot (listener)
├── skills/              # Growing toolkit
├── memory/              # Persistent learnings
└── .claude/             # Claude Code settings
```

## Memory & Learning

Agent learnings live in `memory/MEMORY.md`:
- Infrastructure facts
- Past patterns and solutions
- Rules and constraints
- Domain knowledge

Skills emerge from work, not manual design.

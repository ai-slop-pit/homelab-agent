# Claude Home Agent — CT 112

**An autonomous action engine for the home lab. Learns by working.**

## Quick Start

```bash
# Start Telegram bot
node channels/telegram/bot.js

# Run learning engine
node agent/learner.js

# Run agent manager
node agent/core.js

# Run proposal engine
node agent/proposer.js
```

## What Is This?:> A unified autonomous agent that:
- Runs on your home lab (Proxmox, containert
:> :> , services)
- Listens via Telegram for tasks
- Learns from every execution
- Proposes new automations as patterns emerge
- Manages a growing skill library

See [CLAUDE.md](./CLAUDE.md) for the full philosophy and architecture.

## Documentation

- **[Setup Guide](./docs/00-SETUP-CHECKLIST.md)** — Get the agent running
- **[Architecture](./docs/ARCHITECTURE.md)** — System design
- **[Usage](./docs/USAGE.md)** — How to use the agent
- **[Development](./docs/DEVELOPMENT.md)** — Build new skills
- **[API Reference](./docs/API.md)** — Core APIs
- **[Skills](./docs/SKILLS.md)** — Available skills
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** — Common issues

## Structure

```
/opt/claude-agent/
├── agent/           # Brain (core loop, learner, proposer)
├── channels/        # Interfaces (Telegram)
├── skills/          # Growing toolkit of automations
├── memory/          # Persistent learnings
├── config/          # Service configuration
├── .claude/         # Claude Code settings
└── docs/            # Documentation
```

## Memory

The agent's learnings are stored in `memory/MEMORY.md`. Before any task, it loads:
- Infrastructure facts
- Past failures and wins
- Rules ("never expose secrets")
- Domain knowledge

This makes it smarter with every task.

## Development

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for:
- Adding new skills
- Understanding the learning loop
- Running tests

---

**Status**: Active learning. See `memory/MEMORY.md` for current context.

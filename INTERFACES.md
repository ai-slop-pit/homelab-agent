# Interfaces: How You Talk to the Agent

## Claude Code CLI (Primary)
- Direct reasoning and decisions
- Access to full context and memory
- Complex multi-step tasks
- Source of truth for learning and evolution

## Telegram Bot (Secondary)
- Casual task submission via messages
- Simple message → response flow
- Status queries
- Simple and stateless (no approval gates, no complex workflows)

## How It Works

1. **You** send a Telegram message
2. **Bot** spawns `claude --message "your message"`
3. **Claude** processes it in this session
4. **Bot** sends response back to Telegram

That's it. No state management, no queuing, no complexity.

## Shared Context

Both interfaces read from:
- `memory/MEMORY.md` — Persistent learnings, patterns, rules
- `skills/` — Growing toolkit

Both can update:
- `memory/MEMORY.md` — Record new discoveries
- `skills/` — Propose or deploy new skills

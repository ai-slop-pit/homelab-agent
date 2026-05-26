# Claude Home Agent — CT 112

Autonomous homelab assistant that learns by working.

## What It Does

- **Executes** tasks via Claude Code CLI
- **Learns** patterns from work via memory and skills
- **Evolves** by extracting reusable automation

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Core philosophy: learning loop & operating principles
- **[SOUL.md](SOUL.md)** — Agent personality & communication style
- **`skills/`** — Growing toolkit (skill-creator, infrastructure, memory-manager, investigate)
- **`skills/skill-creator/`** — How skills evolve through work

## Structure

```
/opt/claude-agent/
├── .claude/skills/      # Growing toolkit (skill-creator, infrastructure, etc.)
└── (documentation: CLAUDE.md, SOUL.md, README.md)

/root/.claude/projects/-opt-claude-agent/
└── memory/              # Persistent learnings (MEMORY.md index + individual memory files)
```

## Memory & Learning

Agent learnings live in `/root/.claude/projects/-opt-claude-agent/memory/MEMORY.md`:
- Infrastructure facts (via `/infrastructure` skill)
- Past patterns and solutions
- Rules and constraints
- Domain knowledge

Skills emerge from work (via `/skill-creator`), not manual design.

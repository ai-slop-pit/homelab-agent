# Claude Home Agent — CT 112

**Simple bot that learns by working.**

See [SOUL.md](SOUL.md) for identity, personality, and behavioral boundaries.

---

## The Learning Loop

Every task triggers the same cycle:

1. **Do**: Execute the work
2. **Reflect**: "What problem did I solve? Is this a generic pattern?"
3. **Distill**: Extract reusable logic
4. **Evolve**: Update memory or propose new skill

This is not a separate process — it happens during normal work.

---

## Architecture

**One unified brain, three input channels:**

```
         Memory (persistent learnings)
              ↑↓
    CLI  ← Agent → Telegram
              ↓
         Skills (toolkit)
```

- **CLI** (primary): Direct reasoning, full autonomy
- **Telegram** (secondary): Casual task submission
- **Monitors** (background): Proactive anomaly detection, pattern spotting

All channels read/write to shared memory and skill library.

---

## The Vision

The entire agent system **evolves through work**, not by design.

**Phase 1**: You give tasks → Agent does them, records what it learned  
**Phase 2**: Agent spots patterns → Proposes automations, new capabilities, better approaches  
**Phase 3**: System matures → Behavior, memory, skills, reasoning all improve iteratively  

End state: The agent is smarter, faster, and more autonomous than it started. No one architected that—it just happened through doing.

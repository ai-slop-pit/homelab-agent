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

Skills don't come pre-built. They **emerge from work**.

**Phase 1**: You give tasks → Agent executes them  
**Phase 2**: Agent detects patterns → Proposes new skills  
**Phase 3**: Skills mature → Agent refines based on feedback  

End state: You never wrote a skill manually. They all grew naturally.

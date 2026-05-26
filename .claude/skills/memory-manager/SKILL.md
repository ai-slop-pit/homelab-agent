---
name: memory-manager
description: Continuously evolve persistent memory. Auto-save discoveries, detect staleness, rectify inconsistencies. See MEMORY-MANAGEMENT.md for detailed procedures.
disable-model-invocation: false
---

Memory Manager Skill

**Agent is always memory-aware. Update memory proactively during work.**

## What This Skill Does

- **Auto-save** every discovery, pattern, decision, configuration learned (immediately, mid-task)
- **Update** memory freely—modify facts as you learn them
- **Consolidate** duplicates aggressively (merge, archive automatically)
- **Rectify** inconsistencies on-the-fly (fix timestamps, links, structure)
- **Archive** outdated facts (move to history/, keep git record)
- **Keep fresh** (check staleness, flag and refresh old facts)

## When to Invoke

You don't "invoke" this skill—it's **always active**. Use it:
- During any task: learn something new → save it immediately
- Between tasks: detect stale memory → refresh it
- Anytime: see duplication → consolidate immediately

## How to Use

### Quick Update (Mid-Task)
1. Learn something new during work
2. Find relevant memory file (use MEMORY.md index)
3. Edit or create file
4. Update lastUpdated = today
5. Continue working (no announcement needed)

### Full Procedure Reference
When you need detailed guidance on:
- Freshness validation
- Consolidation strategy
- Archival process
- MEMORY.md management

**Read**: `.claude/skills/memory-manager/MEMORY-MANAGEMENT.md`

This reference file has complete procedures and examples.

## Key Principle

**Memory evolves, not preserved.** Update first, ask questions later. Embrace continuous improvement over protection.

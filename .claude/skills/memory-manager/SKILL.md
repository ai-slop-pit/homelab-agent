---
name: memory-manager
description: When: Starting work (read) or learning something (write). What: Access .claude/memory/, load relevant files, save discoveries immediately. Why: Build persistent learnings across sessions.
disable-model-invocation: false
---

# Memory Manager

**Memory evolves continuously. Read always, write immediately, keep fresh.**

## Essentials

**Read**: Load memory/MEMORY.md (index) → find relevant file → extract fact.

**Write**: Learn something? Write to memory immediately. Update file, refresh memory/MEMORY.md.

## For Specific Tasks

| Task | Read This |
|------|-----------|
| Memory is getting stale / old facts are outdated | [FRESHNESS](procedures/FRESHNESS.md) |
| Duplicate or overlapping memory found | [CONSOLIDATE](procedures/CONSOLIDATE.md) |
| Obsolete facts need removal | [ARCHIVE](procedures/ARCHIVE.md) |
| MEMORY.md index is out of sync | [INDEX](procedures/INDEX.md) |
| Save a new discovery | [AUTOSAVE](procedures/AUTOSAVE.md) |

---

## Key Principle

**Memory evolves, not preserved.** Update immediately. Don't wait for approval.

## Archive Policy

Archive is a **last resort** — use only when:
- Agent is desperate and needs to clear noise from active memory
- User explicitly requests archival of specific memories
- Facts are genuinely obsolete (>90 days old, superseded, service removed)

Archive preserves git history but removes from daily navigation. See [ARCHIVE](procedures/ARCHIVE.md) for procedure.

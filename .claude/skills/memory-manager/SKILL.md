---
name: memory-manager
description: Maintain persistent memory. Auto-save discoveries, keep memory fresh. See reference files for specific tasks.
disable-model-invocation: false
---

Memory Manager Skill

**Agent is memory-aware. Update memory continuously during work.**

## The Essentials

### 1. Read Memory (Always First)
```
1. Load: .claude/memory/MEMORY.md (the index)
2. Find: Which file has what I need?
3. Read: Load that file
4. Use: Extract fact/pattern/rule
```

### 2. Write/Update Memory (Immediately)
```
1. Learn something new? Write it.
2. Find relevant file (use MEMORY.md index)
3. Edit or create file with frontmatter
4. Update lastUpdated = today
5. Update MEMORY.md index if needed
```

---

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

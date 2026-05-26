---
name: memory-manager
description: Maintain persistent memory. Auto-save discoveries, keep memory fresh. For complex operations, see MEMORY-MANAGEMENT.md.
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

## Simple Example

**You learn**: "The storage mount changed from /dev/sda to /dev/sdb"

```
1. Find: MEMORY.md → infrastructure section
2. Open: server_infrastructure.md
3. Update: Change sda → sdb, update lastUpdated
4. Update: MEMORY.md if description changed
5. Done.
```

---

## For Complex Operations

See **[MEMORY-MANAGEMENT.md](MEMORY-MANAGEMENT.md)** for:
- Freshness validation (detecting stale memory)
- Consolidation (merging duplicates)
- Archival (removing obsolete facts)
- Index management (keeping MEMORY.md current)
- Detailed procedures and checklists

---

## Key Principle

**Memory evolves, not preserved.** Update immediately. Don't wait for approval or formal audits.

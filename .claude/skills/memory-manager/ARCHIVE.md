# Archival

**When facts become obsolete and should be removed.**

## Procedure: Archive Outdated Facts

**When**: Fact is no longer relevant OR contradicted by newer info

**Steps**:
1. Identify obsolete fact/file
2. **Move to archive**: `.claude/memory/archive/[YYYY-MM-DD]/[filename].md`
3. Add archival note at top: "Archived [date] because: [reason]"
4. **Remove from MEMORY.md**: Delete index entry
5. Report: "Archived [file] ([reason])"

## Examples

- "This incident was resolved 90 days ago"
- "Superseded by [newer-file]"
- "Service no longer runs on this host"
- "This configuration changed; facts are outdated"

## Archive Structure

```
.claude/memory/archive/
  2026-05-26/
    old-incident-report.md
    deprecated-config.md
  2026-05-25/
    resolved-bug.md
```

## Why Archive, Not Delete?

- Preserves git history (auditable)
- Can resurrect if needed
- Keeps record of what changed

Archival is removal + history preservation.

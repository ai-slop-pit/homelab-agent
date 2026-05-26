# Archival

**Last resort: move obsolete facts to archive when desperate or explicitly requested.**

## When to Archive

- Agent is drowning in active memory noise and needs cleanup
- User explicitly says "archive this"
- Fact is genuinely obsolete (superseded, service removed, no longer applicable)
- Don't archive just because memory is old — age alone doesn't matter; relevance does
- Don't archive unless really necessary — keep decisions, lessons, preferences active

## Procedure: Archive Outdated Facts

**When**: Fact is no longer relevant OR contradicted by newer info AND cleanup is needed

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

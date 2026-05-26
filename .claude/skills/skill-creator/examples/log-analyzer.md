# Example: log-analyzer Skill (Minimal)

**Simpler example: early-stage skill with just SKILL.md + procedures.**

---

## Pattern Detection

**Scenario**: Agent analyzed container logs four times in May 2026:
1. Proxmox container crash → parsed 500-line log file
2. Docker service restart → searched for error patterns
3. n8n workflow failure → extracted relevant lines from noisy logs
4. App performance issue → filtered by timestamp range

**Pattern detected**: Manual log analysis (same filtering/parsing steps)

---

## Minimal Skill Structure

**Directory**:
```
.claude/skills/log-analyzer/
├── SKILL.md (28 lines)
└── procedures/
    ├── FILTER.md (42 lines)
    ├── PARSE.md (38 lines)
    └── CORRELATE.md (45 lines)
Total: 153 lines (lean, MVP)
```

---

## SKILL.md (The Entry Point)

```markdown
---
name: log-analyzer
description: Filter, parse, and correlate log entries to find patterns and errors.
disable-model-invocation: false
---

# Log Analyzer

**Extract signal from noisy logs. Find patterns, errors, correlations.**

## The Essentials

### 1. Filter Logs by Pattern
- Time range? Error level? Process name?
- Extract relevant lines quickly

### 2. Parse Structured Logs
- JSON logs → extract fields
- Syslog format → parse timestamp and level

## For Specific Tasks

| Task | Read This |
|------|-----------|
| Extract logs matching criteria | [FILTER](procedures/FILTER.md) |
| Parse structured log format | [PARSE](procedures/PARSE.md) |
| Find correlated events | [CORRELATE](procedures/CORRELATE.md) |

## Key Principle

**Reduce noise first. Pattern emerges from filtered signal.**
```

---

## Why This Example is Minimal

✅ SKILL.md alone is sufficient to understand when/how to use
✅ Procedures are focused (one task each)
✅ No templates/ — skill doesn't generate artifacts
✅ No examples/ — procedures include real examples
✅ No schemas/ — inputs/outputs are simple (file paths, filters)
✅ Total: 153 lines (well under 250 minimum)

---

## Maturity Path

**Month 1**: Works for common cases
- 8 uses, 75% success rate
- User feedback: "helpful, needs examples for JSON logs"

**Month 2**: Add examples/
```
examples/
├── json-log-example.md
├── syslog-example.md
└── correlation-walkthrough.md
```

**Month 3**: Performance issue detected
- Users parse 10,000+ line logs
- Propose new procedure: OPTIMIZE.md (streaming filter, tail-based)

**Month 6**: Add templates/ for log format parsers
```
templates/
├── json-parser-template.sh
└── syslog-parser-template.sh
```

---

## Moral of This Example

**Start minimal.** SKILL.md + procedures/ is sufficient.
Add templates/, examples/, schemas/ only when they solve real problems.


# Skill Creation Principles

**Guidelines for designing new skills, based on lessons from memory-manager.**

---

## Core Philosophy

Skills are **agent-native capabilities** that emerge through work. When the agent detects a reusable pattern, it proposes a new skill.

**Key principle**: A skill should be **easy to load and use**. Minimize context bloat. Keep essentials lean.

---

## Skill Structure

Every skill has:
1. **SKILL.md** — Main entry point (25-30 lines max)
2. **procedures/** — Detailed reference files (40-50 lines each)

### SKILL.md (Always Loaded)

Must contain:
- **Identity**: What is this skill? One sentence.
- **Essentials**: 2-3 core procedures or use cases
- **Routing table**: Simple table linking tasks → reference files
- **Key principle**: The core philosophy in one sentence

Example structure:
```markdown
---
name: my-skill
description: One-line description. See procedures/ for details.
---

# My Skill

**One-sentence identity.**

## Essentials

### Use Case 1
[Quick steps]

### Use Case 2
[Quick steps]

## For Specific Tasks

| Task | Read This |
|------|-----------|
| Task A | [REFERENCE-A](procedures/REFERENCE-A.md) |
| Task B | [REFERENCE-B](procedures/REFERENCE-B.md) |

## Key Principle

**One-sentence core philosophy.**
```

### procedures/ (Load on Demand)

Each file focuses on ONE use case:
- Clear heading: "Task X" or "When Y"
- Quick explanation
- Step-by-step procedure
- Example
- Keep it focused (~40-50 lines)

Example:
```markdown
# Task X

**When to use this.**

## Procedure: Do Task X

**When**: Condition for when you'd do this

**Steps**:
1. Step 1
2. Step 2
3. etc

## Example

Real example of doing this task.
```

---

## Design Checklist

When creating a new skill:

- [ ] **SKILL.md is lean**: ~25-30 lines (covers essentials only)
- [ ] **Essentials are clear**: Can agent do the skill's main job from SKILL.md alone?
- [ ] **procedures/ is organized**: Each file is one use case, not one step
- [ ] **Routing is obvious**: Simple table, "when you need X, read Y"
- [ ] **No duplication**: SKILL.md essentials don't repeat in procedures/
- [ ] **Examples included**: Each procedure file has at least one example
- [ ] **Name is action verb**: "memory-manager", "app-monitor", "code-reviewer" (not "memory", "app", "code")
- [ ] **Frontmatter is complete**: name, description, disable-model-invocation

---

## Anti-Patterns (What to Avoid)

❌ **Monolithic SKILL.md** — Don't put everything in one file
❌ **Unclear routing** — Don't make agent guess which file to read
❌ **Procedure-numbered files** — Don't create "procedure-1.md", "procedure-2.md"
❌ **Over-detailed SKILL.md** — Don't include step-by-step procedures in SKILL.md
❌ **Vague descriptions** — Don't say "skill for doing things"; be specific
❌ **No examples** — Every procedure should have a concrete example
❌ **Context bloat** — Don't load all reference files; agent loads only SKILL.md by default

---

## File Size Guidelines

| File | Lines | Notes |
|------|-------|-------|
| SKILL.md | 25-30 | Essentials only |
| Each procedures/* | 40-50 | Focused on one task |
| Total skill | 250-300 | Everything combined |

---

## Example: Well-Designed Skill

**memory-manager**:
- SKILL.md (22 lines): Read memory, write memory, routing table
- procedures/FRESHNESS.md (40 lines): Check stale memory
- procedures/CONSOLIDATE.md (37 lines): Merge duplicates
- procedures/ARCHIVE.md (40 lines): Remove old facts
- procedures/INDEX.md (38 lines): Manage MEMORY.md
- procedures/AUTOSAVE.md (46 lines): Save discoveries

Total: ~223 lines, but agent only loads SKILL.md unless it needs a specific task.

---

## When to Create a New Skill

Agent creates a skill when:
1. **Pattern detected**: Agent solved the same problem 3+ times
2. **Generic problem identified**: "This is a class of problem worth solving"
3. **Reusable logic extracted**: Can formalize it into procedures
4. **Proposed to user**: "Should I create skill X?"

---

## Skill Evolution

Skills improve over time:
- **Phase 1**: Essentials only (SKILL.md)
- **Phase 2**: Complex use cases added (procedures/)
- **Phase 3**: Procedures refined based on experience
- **Phase 4**: New procedure files created as needed

Don't design skills "complete" upfront. Let them grow through use.

---

## Quick Summary

1. **SKILL.md**: Essentials + routing table
2. **procedures/**: One file per use case
3. **Size**: ~25 lines SKILL + ~45 lines per procedure
4. **Context**: Load SKILL.md always, procedures on demand
5. **Design**: Lean, focused, example-driven
6. **Evolution**: Start simple, grow through use

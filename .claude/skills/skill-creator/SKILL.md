---
name: skill-creator
description: Discover reusable patterns in work. Propose, draft, and implement new skills autonomously. See procedures/ for specific tasks.
disable-model-invocation: false
---

# Skill Creator

**Agent detects patterns, proposes new skills, implements them declaratively.**

## The Essentials

### 1. Detect Patterns (During Work)
```
Watch for repetition:
1. Same problem solved 3+ times → pattern detected
2. Identify the generic problem class
3. Ask: "Is this worth a dedicated skill?"
4. If yes → trigger Propose
```

### 2. Propose & Draft (Schema-First)
```
1. Analyze: What is the core procedure?
2. Design: What inputs/outputs? When triggered?
3. Draft SKILL.md with frontmatter + essentials
4. Plan: What reference procedures are needed?
5. Present to user with reasoning
```

### 3. Implement Fast-Path (Declarative)
```
1. Create skill directory: .claude/skills/<name>/
2. Write SKILL.md (25-30 lines, essentials only)
3. Draft procedures/ files (40-50 lines each)
4. Test: Does it work for the original problem?
5. Deploy to git
```

---

## For Specific Tasks

| Task | Read This |
|------|-----------|
| Detecting patterns in work | [DETECT](procedures/DETECT.md) |
| Analyzing and characterizing problems | [ANALYZE](procedures/ANALYZE.md) |
| Drafting SKILL.md and procedures | [PROPOSE](procedures/PROPOSE.md) |
| Creating the skill directory structure | [IMPLEMENT](procedures/IMPLEMENT.md) |
| Monitoring skill effectiveness | [MONITOR](procedures/MONITOR.md) |

---

## Key Principle

**Skills emerge through work, not pre-design.** Detect gaps, propose solutions, deploy declaratively, evolve continuously.

---

## Structure & Organization

See **[STRUCTURE.md](../STRUCTURE.md)** for canonical skill directory layout and directory semantics.

**skill-creator itself exemplifies the full structure**:
- `SKILL.md` — this file
- `procedures/` — five how-to guides (DETECT, ANALYZE, PROPOSE, IMPLEMENT, MONITOR)
- `templates/` — reusable templates (SKILL-template.md, procedure-template.md)
- `examples/` — concrete walkthroughs (app-health-monitor, log-analyzer)

# Implementing New Skills (Fast-Path)

**When to use this: Proposal approved. Create the skill directory and files.**

## Procedure: Scaffold & Implement Skill

**When**: User approves new skill; ready to create directory structure.

**Fast-Path Implementation**:

1. **Create directory structure**:
   ```
   .claude/skills/<skill-name>/
   ├── SKILL.md
   ├── procedures/
   │   ├── TASK-1.md
   │   ├── TASK-2.md
   │   └── TASK-3.md
   └── scripts/ (optional: helper utilities)
       └── helper.sh
   ```

2. **Write SKILL.md** (25-30 lines max)
   - Frontmatter: `name`, `description`, `disable-model-invocation: false`
   - One-sentence identity
   - 2-3 essential use cases
   - Routing table (task → procedure file)
   - Key principle (one sentence)
   - **NO "When to Use" section** — description frontmatter already defines it

3. **Create procedure files** (40-50 lines each)
   - One file per task/use case
   - Structure: heading + Procedure + Example + links
   - Real example from the pattern that triggered the skill
   - Action-verb naming: DIAGNOSE.md, SETUP.md, not PROCEDURE-1.md
   - Link back to SKILL.md
   - **Skip "When to use"** — procedure name + routing table already define it

4. **Quick validation**:
   - SKILL.md alone sufficient? (reader understands when/how without other files)
   - Each procedure has concrete example? ✓
   - Routing table matches files? ✓
   - Total: 25-30 (SKILL.md) + 40-50 per procedure = ~250-300 lines ✓

## Example: App-Health-Monitor

Create in order:
1. SKILL.md (22 lines: frontmatter + identity + 2 essentials + routing)
2. procedures/DIAGNOSE.md (48 lines: real example from pattern)
3. procedures/SETUP.md (46 lines)
4. procedures/INTEGRATE.md (44 lines)

Result: ~160 lines total (well under 250-300 budget)

## Skill Description Pattern

All skill descriptions follow **When → What → Why**:

```
When: <activation trigger>
What: <core operation>
Why: <value/motivation>
```

**Frontmatter (80-120 chars)**:
```yaml
description: "When: <trigger>. What: <operation>. Why: <value>"
```

**Examples**:
- `infrastructure`: "When: Need container/hardware/storage info. What: Unified Proxmox access. Why: Single source of truth."
- `skill-creator`: "When: 3+ repetitions. What: Pattern detection → skill design → implementation. Why: Extract reusable automation."

Apply this pattern to all new skills for consistency.

---

## After Implementation

Test the skill on the original problem that triggered discovery:
- Does it solve the problem?
- Are procedure instructions clear?
- Did examples match real usage?

Then hand off to [MONITOR](MONITOR.md) to track effectiveness.

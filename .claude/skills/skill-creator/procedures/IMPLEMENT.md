# Implementing New Skills (Fast-Path)

**When to use this: Proposal approved. Create the skill directory and files.**

## Procedure: Scaffold & Implement Skill

**When**: User approves new skill; ready to create directory structure.

**Fast-Path Implementation**:

1. **Create directory structure**:
   ```
   .claude/skills/<skill-name>/
   ├── SKILL.md
   └── procedures/
       ├── TASK-1.md
       ├── TASK-2.md
       └── TASK-3.md
   ```

2. **Write SKILL.md** (25-30 lines max)
   - Frontmatter: `name`, `description`, `disable-model-invocation: false`
   - One-sentence identity
   - 2-3 essential use cases
   - Routing table (task → procedure file)
   - Key principle (one sentence)

3. **Create procedure files** (40-50 lines each)
   - One file per task/use case
   - Structure: heading + "When to use" + Procedure + Example + links
   - Real example from the pattern that triggered the skill
   - Action-verb naming: DIAGNOSE.md, SETUP.md, not PROCEDURE-1.md
   - Link back to SKILL.md

4. **Quick validation**:
   - SKILL.md alone sufficient? (reader understands when/how without other files)
   - Each procedure has concrete example? ✓
   - Routing table matches files? ✓
   - Total: 25-30 (SKILL.md) + 40-50 per procedure = ~250-300 lines ✓

## Example: App-Health-Monitor Implementation

**Directory structure**:
```
.claude/skills/app-health-monitor/
├── SKILL.md (22 lines)
├── procedures/
│   ├── DIAGNOSE.md (48 lines)
│   ├── SETUP.md (46 lines)
│   └── INTEGRATE.md (44 lines)
```

**File creation order**:
1. SKILL.md (front-load the routing)
2. procedures/DIAGNOSE.md (most common task)
3. procedures/SETUP.md (setup task)
4. procedures/INTEGRATE.md (advanced use)

## After Implementation

Test the skill on the original problem that triggered discovery:
- Does it solve the problem?
- Are procedure instructions clear?
- Did examples match real usage?

Then hand off to [MONITOR](MONITOR.md) to track effectiveness.

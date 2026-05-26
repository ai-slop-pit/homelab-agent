# Implementing New Skills (Fast-Path)

**When to use this: Proposal approved. Create the skill directory and files.**

## Procedure: Create Skill Structure

**When**: User approves new skill; ready to implement.

**Fast-Path Implementation**:
1. **Create directory**: `.claude/skills/<skill-name>/`
   ```bash
   mkdir -p .claude/skills/app-health-monitor/{procedures}
   ```

2. **Write SKILL.md** (25-30 lines max)
   - Frontmatter: `name`, `description`, `disable-model-invocation`
   - One-sentence identity
   - 2-3 essential use cases
   - Routing table (task → procedure file)
   - Key principle

3. **Plan procedure files** (40-50 lines each)
   - One file per use case
   - Clear heading: "Task X" or "When Y"
   - "When to use" section
   - Step-by-step procedure
   - Real example from the pattern that triggered the skill
   - Link to next procedure or back to SKILL.md

4. **Procedure naming** (action-verb style)
   - DIAGNOSE.md, SETUP.md, MONITOR.md (not PROCEDURE-1.md)
   - Match the task names in the routing table

5. **Validation**:
   - Can agent use SKILL.md alone to understand when/how to use it?
   - Does each procedure have a concrete example?
   - Are routing links in SKILL.md accurate?
   - Total skill size ~250-300 lines (lean but complete)?

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

1. **Test the skill**: Use it on the original problem that triggered discovery
   - Does it solve the problem?
   - Are procedure instructions clear?
   - Did examples match real usage?

2. **Git commit**: Add to version control
   ```bash
   git add .claude/skills/app-health-monitor/
   git commit -m "feat: Add app-health-monitor skill"
   ```

3. **Hand off to [MONITOR](MONITOR.md)** to track effectiveness.

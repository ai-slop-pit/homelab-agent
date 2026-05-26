# Validating Skill Structure

**When to use this: Skill is built. Is it well-formed and ready to deploy?**

## Procedure: Quality Check

**When**: All procedures written; skill ready for deployment.

**Validation checklist**:

✅ **Frontmatter**
- [ ] `name:` matches directory name
- [ ] `description:` is one line, under 100 chars
- [ ] `disable-model-invocation: false` (or intentional false)

✅ **SKILL.md Structure**
- [ ] One-sentence identity present
- [ ] 2-3 essentials described (use cases)
- [ ] Routing table exists (task → procedure file)
- [ ] Key principle is non-obvious (one sentence)
- [ ] Total: 25-30 lines (essentials only)

✅ **Procedures**
- [ ] Each procedure has a task name (action verb)
- [ ] "When to use" section is clear
- [ ] Steps are numbered/logical
- [ ] Real example from pattern that triggered skill
- [ ] Links back to SKILL.md or next procedure
- [ ] Each: 40-50 lines (focused, not sprawling)

✅ **Routing Accuracy**
- [ ] SKILL.md routing table matches actual files
- [ ] No broken links
- [ ] Procedures link back correctly

✅ **Size Budget**
- [ ] SKILL.md: 25-30 lines
- [ ] Each procedure: 40-50 lines
- [ ] Total: 250-350 lines for standard skill

✅ **Can Agent Understand This?**
- [ ] Is SKILL.md sufficient to know when/how to use skill?
- [ ] Would a new user understand from routing table alone?
- [ ] Are examples concrete enough to follow?

## Example: Validating `config-manager` Skill

**Checklist run**:
```
✓ name: config-manager (matches directory)
✓ description: "Track, diff, and apply config changes..." (one line, 65 chars)
✓ disable-model-invocation: false

✓ SKILL.md: 28 lines, identity + 2 essentials + routing table
✓ DIFF.md: 48 lines, real example from PostgreSQL migration
✓ APPLY.md: 46 lines, rollback strategy included
✓ ROLLBACK.md: 44 lines, recovery procedure with example

✓ Routing accurate: 3 procedures, 3 entries in table
✓ No broken links

✓ Total: 28 + 48 + 46 + 44 = 166 lines (well under 350 limit)

✓ SKILL.md alone sufficient? YES
  - User reads: "Track, diff, and apply config changes"
  - User sees: Routing to DIFF, APPLY, ROLLBACK
  - User knows: Which procedure for their task
```

**Result**: PASS ✓ Ready for git commit

## Failure Scenarios & Fixes

**Problem**: Routing table references non-existent file
- **Fix**: Create the file or remove from routing table

**Problem**: Procedure is 80 lines (too long)
- **Fix**: Split into two procedures; update routing table

**Problem**: SKILL.md describes how to do tasks
- **Fix**: Move details to procedures/; keep SKILL.md as essentials only

**Problem**: Example doesn't match skill purpose
- **Fix**: Replace with real example from pattern; verify it works

## After Validation

**If PASS**: 
1. Commit: `git add .claude/skills/<skill-name>/`
2. Commit message: `feat: Add <skill-name> skill`
3. Move to monitoring (see [skill-creator → MONITOR](../../skill-creator/procedures/MONITOR.md))

**If FAIL**:
1. Fix issues per checklist
2. Re-validate
3. Repeat until PASS

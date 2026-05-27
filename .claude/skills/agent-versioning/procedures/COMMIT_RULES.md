---
name: commit-rules
description: Enforce conventional commit format and pre-commit/push checklists
---

# Commit Rules & Checklists

## Core Principle

**Commits capture milestones, not activity.** Group changes by feature/fix/capability. Avoid committing random scattered changes. Ask: "Does this commit represent a logical unit of work that the agent completed?"

## Commit Message Format

Follow **Conventional Commits** for consistency:

```
<type>: <summary>

<body (optional)>

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

### Types

- **feat**: New feature or capability
- **fix**: Bug fix
- **refactor**: Code cleanup, restructuring (no behavior change)
- **docs**: Documentation changes (README, SOUL.md, etc.)
- **chore**: Config, tooling, dependencies, CI/CD

### Summary

- Lowercase, imperative ("add feature" not "added feature")
- Under 50 characters
- No period at end

### Body

- Optional but encouraged for non-trivial changes
- Explain *why*, not what (code shows what)
- Wrap at 72 characters
- Separate from summary with blank line

### Co-Author Line

Always include:
```
Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

## Pre-Commit Checklist

Before running `git commit`:

- [ ] Changes represent ONE logical unit (one feature/fix/capability)
- [ ] No scattered random changes (if multiple unrelated things, split into separate commits)
- [ ] No secrets in diff (`API_KEY`, `PASSWORD`, `TOKEN`, `.env` contents)
- [ ] No large binaries or node_modules
- [ ] Commit message follows format above
- [ ] Only related changes (no unrelated code mixed in)
- [ ] Tests pass (if applicable)
- [ ] Code reviewed for obvious issues

**Ask yourself**: "Does this commit represent one milestone the agent completed?" If not, it should be split or grouped differently.

Run:
```bash
git diff --cached | grep -i "api_key\|password\|token\|secret"
# Should return nothing
```

## Pre-Push Checklist

Before running `git push`:

- [ ] All commits are atomic and logical (grouped by feature/fix)
- [ ] Branch is up-to-date: `git pull origin main`
- [ ] All commits have proper message format (run `git log -n5`)
- [ ] No force-push to main: use `git push origin main` (not `--force`)
- [ ] Remember: Agent commits only with explicit user approval

## Real Examples

### ✅ Good Commits

```
feat: Add agent-versioning skill for self-aware releases
fix: Remove exposed secrets from SOUL.md
refactor: Consolidate skill infrastructure
docs: Update README with correct memory path
chore: Update settings.json permissions
```

### ❌ Bad Commits

```
updated code
fixed stuff
bug fix
version bump
changes
wip
```

## See Also

- [CREATE_RELEASE](CREATE_RELEASE.md) — How to make a release
- [SKILL.md](../SKILL.md) — Skill overview and routing

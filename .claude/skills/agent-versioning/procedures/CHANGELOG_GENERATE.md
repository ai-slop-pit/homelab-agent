---
name: changelog-generate
description: Extract commits since last release and format as changelog
---

# Generate Changelog

## Steps

### 1. Find the Last Release

```bash
git tag -l | sort -V | tail -1
```

Output example: `v1.0.0`

### 2. Extract Commits Since Last Release

```bash
LAST_TAG=$(git tag -l | sort -V | tail -1)
git log $LAST_TAG..HEAD --oneline --pretty="%h %s"
```

Example output:
```
26d2458 chore: Finalize investigate skill configuration
828fc9f docs: Update README with correct memory path
a312002 fix: Remove git/version control references
```

### 3. Categorize by Type

Group commits by their type (feat, fix, refactor, docs, chore):

```bash
LAST_TAG=$(git tag -l | sort -V | tail -1)
git log $LAST_TAG..HEAD --pretty="%s" | grep -E "^(feat|fix|refactor|docs|chore):" | sort
```

### 4. Format as Markdown Release Notes

Create release notes in this format:

```markdown
## What's New in v1.1.0

### Features
- Add agent-versioning skill for self-aware version management
- Support semantic versioning in release workflow

### Fixes
- Fix README memory path documentation
- Remove exposed secrets from SOUL.md

### Refactoring
- Consolidate skill infrastructure procedures
- Simplify release checklist

### Documentation
- Update SOUL.md personality guide
```

### 5. Highlight Breaking Changes

If any commits start with `BREAKING:`, call them out:

```markdown
### ⚠️ Breaking Changes
- BREAKING: Removed old memory format; migration required
```

## Real Example

If last release is `v1.0.0` and current HEAD has:
```
26d2458 chore: Finalize investigate skill
828fc9f docs: Update README
```

Output:
```markdown
## What's New in v1.1.0

### Documentation
- Update README with correct memory path

### Chores
- Finalize investigate skill configuration
```

## See Also

- [CREATE_RELEASE](CREATE_RELEASE.md) — How to publish the changelog
- [COMMIT_RULES](COMMIT_RULES.md) — Commit format reference

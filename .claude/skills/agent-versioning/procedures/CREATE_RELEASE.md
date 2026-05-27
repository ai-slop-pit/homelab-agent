---
name: create-release
description: Create GitHub release from tag and release notes
---

# Create Release

## Prerequisites

- Last release is tagged (e.g., `v1.0.0`)
- Changelog generated and formatted (see [CHANGELOG_GENERATE](CHANGELOG_GENERATE.md))
- All commits pushed to origin/main

## Steps

### 1. Determine Next Version

Check current tags:
```bash
git tag -l | sort -V
# Output: v1.0.0
```

Determine semantic version increment:
- **Major** (v1.0.0 → v2.0.0): Breaking changes
- **Minor** (v1.0.0 → v1.1.0): New features
- **Patch** (v1.0.0 → v1.0.1): Bug fixes

For this example, we'll use `v1.1.0`.

### 2. Create Git Tag

```bash
git tag -a v1.1.0 -m "Release v1.1.0: Agent Versioning Skill

- Add agent-versioning skill for self-aware version management
- Enforce commit rules and release workflow
- Simplify release process with procedures"
```

### 3. Push Tag to GitHub

```bash
git push origin v1.1.0
```

Verify:
```bash
git ls-remote --tags origin | grep v1.1.0
```

### 4. Create GitHub Release

Use `gh release create` with the changelog:

```bash
gh release create v1.1.0 \
  --title "v1.1.0: Agent Versioning Skill" \
  --notes "## What's New

### Features
- Add agent-versioning skill for self-aware releases

### Documentation
- Update README with correct memory path

See [full commit history](https://github.com/ai-slop-pit/homelab-agent/compare/v1.0.0...v1.1.0)"
```

Or from a file:
```bash
gh release create v1.1.0 --title "v1.1.0" --notes-file CHANGELOG.md
```

### 5. Verify Release on GitHub

Visit: `https://github.com/ai-slop-pit/homelab-agent/releases/tag/v1.1.0`

Check:
- [ ] Tag appears with correct commit
- [ ] Release notes are formatted correctly
- [ ] Version number is accurate

## Complete Example Workflow

```bash
# 1. Check last release
git tag -l | sort -V | tail -1
# Output: v1.0.0

# 2. Review commits since last release
git log v1.0.0..HEAD --oneline

# 3. Create tag
git tag -a v1.1.0 -m "Release v1.1.0: Add agent-versioning skill"

# 4. Push tag
git push origin v1.1.0

# 5. Create release on GitHub
gh release create v1.1.0 --title "v1.1.0" --notes "See [commits](https://github.com/ai-slop-pit/homelab-agent/compare/v1.0.0...v1.1.0)"

# 6. Verify
gh release view v1.1.0
```

## Rollback

If you created a release by mistake:

```bash
# Delete local tag
git tag -d v1.1.0

# Delete remote tag
git push origin --delete v1.1.0

# Delete GitHub release
gh release delete v1.1.0 -y --cleanup-tag
```

## See Also

- [CHANGELOG_GENERATE](CHANGELOG_GENERATE.md) — How to extract and format commits
- [COMMIT_RULES](COMMIT_RULES.md) — Commit format reference
- [SKILL.md](../SKILL.md) — Release workflow overview

---
name: agent-versioning
description: "When: Work feels complete (feature done, capability added) and state should be captured. What: Atomic commits by feature, enforce rules, create releases. Why: Agent tracks its own evolution; commits capture milestones, not random changes."
disable-model-invocation: false
---

# Agent Versioning

Manages the agent's own version lifecycle: commits, pushes, releases.

## Essentials

**Quick reference:**
- [Commit Rules & Pre-Push Checklist](procedures/COMMIT_RULES.md) — Format, branch, secrets, tests
- Release workflow: [Changelog](procedures/CHANGELOG_GENERATE.md) → [Create Release](procedures/CREATE_RELEASE.md)

## Procedure Map

| Use Case | Go To |
|----------|-------|
| Committing changes | [COMMIT_RULES](procedures/COMMIT_RULES.md) |
| Before pushing | [COMMIT_RULES](procedures/COMMIT_RULES.md) pre-push section |
| Creating a release | Start with [CHANGELOG_GENERATE](procedures/CHANGELOG_GENERATE.md) |

## Key Principle

Agent commits are auditable, releases are semantic.

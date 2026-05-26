---
name: feedback_git_workflow
description: Agent commits/pushes after milestones but always asks for approval first
metadata:
  type: feedback
  created: 2026-05-26
---

**Rule**: After milestones (task completion, skill creation, major learnings), propose a commit/push to https://github.com/ai-slop-pit/homelab-agent. Always ask for approval before executing.

**Why**: User wants institutional memory captured in git but with human oversight — prevents accidental pushes and allows filtering of what's worth committing.

**How to apply**: 
- After completing significant work, identify if it's a "milestone" (new skill, major task, learning update)
- Draft the commit message
- Ask user: "Ready to commit? [commit message preview]"
- Wait for approval before `git add`, `git commit`, `git push`
- Remote: https://github.com/ai-slop-pit/homelab-agent

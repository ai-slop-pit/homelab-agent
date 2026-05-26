---
name: feedback_show_memory_diffs
description: Always show a diff or before/after when writing or editing memory files
metadata:
  type: feedback
  created: 2026-05-27
---

When writing or editing memory files (MEMORY.md or any memory/*.md), always show the user what changed — a short diff or before/after block inline in the response.

**Why:** User cannot see the file edits in the UI and wants to know what was actually saved without having to ask.

**How to apply:** After every memory write/edit, include a fenced diff block in the reply showing the lines added/changed/removed.

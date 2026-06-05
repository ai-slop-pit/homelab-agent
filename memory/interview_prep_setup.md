---
name: interview-prep-setup
description: User's LeetCode interview prep setup — Claude Code slash commands, workflow, context
metadata:
  type: project
---

User is preparing for senior backend engineer job interviews (~2026-07). 12y exp, 8y at Wix, Lithuania.

## Claude Code Slash Commands (`.claude/commands/`)

Set up in their interview prep project folder:

- `/hint.md` — one nudge without spoiling, asks what they've tried first
- `/review.md` — full interviewer review: walk me through it → complexity → bugs → hire/no hire → optimal solution
- `/interrogate.md` — FAANG-style one-question-at-a-time interrogation
- `/pattern.md` — identifies algorithmic pattern + 2-3 similar problems to practice
- `/optimize.md` — guides toward optimal complexity without giving it away
- `/edgecases.md` — Socratic edge case discovery, doesn't reveal gaps directly
- `/complexity.md` — asks user to derive complexity themselves, pushes back if vague

## Workflow

1. Solve problem (25 min timer, no Claude until done or time up)
2. `/interrogate` — explain approach under pressure
3. `/review` — full debrief
4. `/optimize` or `/edgecases` — go deeper if needed
5. `/pattern` — identify what to practice next

## CLAUDE.md mentor prompt

Project-level CLAUDE.md sets mentor persona: doesn't give answers immediately, asks complexity first, names patterns, acts like real interviewer.

**Why:** User wants to simulate real interview pressure, not just get solutions.
**How to apply:** When helping with LeetCode, default to Socratic/interrogation style unless asked otherwise.

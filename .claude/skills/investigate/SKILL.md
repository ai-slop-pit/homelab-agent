---
name: investigate
description: "When: Need answer to any question (current events, research, verification, debugging). What: Build validation prompt, call Gemini CLI, get sources + evidence. Why: Never assume—always search, validate, cite."
disable-model-invocation: false
---

# Investigate Skill

**Delegate investigation to Gemini CLI. Don't assume—search, validate, verify sources.**

## Essentials

**Need answer to any question**: Build validation prompt, call Gemini, validate results.

```bash
./.claude/skills/investigate/scripts/investigate-prompt.sh "Your question?" | gemini -p -
```

**Validation requirements** (built into prompt):
- 2+ independent sources per claim
- Flag contradictions
- Confidence levels (High/Medium/Low)
- Return sources and evidence

## Key Principle

**Never assume. Always search, validate, cite sources.**

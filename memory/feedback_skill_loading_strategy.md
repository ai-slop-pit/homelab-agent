---
name: feedback_skill_loading_strategy
description: Load skills proactively based on task type, not reactively from memory
metadata:
  type: feedback
---

**Rule**: Recognize task type from user message header/context → load appropriate skill immediately (don't check memory first).

**Why**: Loading skills based on task type is faster and more reliable than searching memory. Skills are the source of truth for their domains. Memory is for learnings and preferences, not task execution.

**How to apply**:

**Task type → Skill mapping**:
- "what is my [service] link?" / "where is [container]?" / "check [service]" → Load `infrastructure`
- "review my PR" / "code review" → Load `code-review`  
- "run the app" / "start the server" / "test the feature" → Load `run` or `verify`
- "I want to schedule X" → Load `schedule`
- "help me learn X" → Load `investigate` or relevant domain skill

**Key principle**: Don't go to memory first for task execution. Use memory ONLY for:
- User preferences (theme, editor config)
- Past learnings/patterns to apply
- Context that's hard to derive from code
- Non-task facts

**Example**:
- ❌ User asks "what's my torrents link?" → I check memory → fail → search → eventually ask for skill help
- ✅ User asks "what's my torrents link?" → I recognize infrastructure task → load skill → read LOOKUP.md → answer

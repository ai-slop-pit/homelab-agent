# Claude Home Agent -- CT 112

**Simple bot that learns by working.**

See [SOUL.md](SOUL.md) for identity, personality, and behavioral constraints.

---

## MANDATORY: Before Every Task

**Step 0 -- Load Memory and Skills (NO EXCEPTIONS)**

Before doing ANYTHING else -- even thinking about the task -- do this:

1. Read /opt/claude-agent/memory/MEMORY.md
2. Based on task type, load the relevant memory files listed in the index
3. Scan /opt/claude-agent/skills/ for skills that match the task
4. Only then proceed with the task

**Why this is non-negotiable:** Memory contains critical facts about this server, user preferences, past decisions, and known failure modes. Skipping it means working blind and repeating mistakes.

Example: User asks about a container -> load server_infrastructure.md FIRST. User asks about git -> load feedback_git_workflow.md FIRST.

---

## MANDATORY: After Every Task

**Step Last -- Reflect and Evolve**

After completing every task, run the learning loop:

1. **Reflect**: What problem did I solve? Any reusable insight?
2. **Distill**: Extract the pattern or fact
3. **Evolve**: IF there is a new learning -> update or create a memory file in /opt/claude-agent/memory/
4. **Skills**: IF a reusable procedure emerged -> create a skill in /opt/claude-agent/skills/

This is not optional. The agent grows through this loop. If you skip it, knowledge dies with the session.

---

## Memory System

- **Index**: /opt/claude-agent/memory/MEMORY.md -- start here every time
- **Files**: individual .md files per topic
- **Archive**: /opt/claude-agent/memory/archive/ -- stale files go here

## Skill vs Memory -- the rule

- **Skills** = facts about the environment + procedures. Load before task execution. (services, IPs, commands, how-to)
- **Memory** = things discovered through work. Write after the fact. (user preferences, non-obvious learnings, decisions made)

Example: service URL -> skill. User prefers dark theme -> memory.

**Write memory when you:**
- Discover infrastructure details (IPs, ports, paths, container IDs)
- Learn user preferences or working style
- Solve a non-obvious problem (document the solution)
- Make a decision with tradeoffs (document the reasoning)

**Do NOT write memory for:**
- Transient task results
- Generic knowledge already in your training
- Obvious or throwaway facts

---

## Skills System

- **Location**: /opt/claude-agent/skills/
- **Format**: Markdown files named by domain (infrastructure.md, git.md, etc.)
- **Contents**: step-by-step procedures, command patterns, decision trees

Create a new skill when you notice you have done the same multi-step procedure twice.

---

## Architecture

Memory (persistent learnings) <-> Agent <-> Skills (reusable procedures)

---

## Git and Version Control

- Never commit without asking first
- Always ask: Ready to commit? and summarize changes
- User decides approval, timing, and message

---

## Core Principle: System Issues != Memory

Memory is for learnings and patterns. When you discover a system design problem, fix it in code.

- Wrong: Agent used 22 tool calls. Save as feedback.
- Right: Agent used 22 tool calls. Find root cause. Fix the system.

---

## The Vision

Phase 1: Tasks -> do them -> record learnings
Phase 2: Agent spots patterns -> proposes automations and new capabilities
Phase 3: System matures -> behavior, memory, skills all improve through use

End state: smarter, faster, more autonomous. Not by design -- by doing.

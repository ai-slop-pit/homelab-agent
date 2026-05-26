---
name: remember-important-things
description: "Always remember and save important context, decisions, setups, patterns"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 99a35177-3c24-4e09-824f-d31aa0010bce
  lastUpdated: 2026-05-26
---

**Rule**: Remember ALL important things. If unsure whether something is important, ask the user if they want you to remember it.

**Why**: Repeatedly asking about the same context, setup, configuration, or decision wastes time and frustrates the user. The agent should build up institutional knowledge over conversations.

**How to apply**: 
1. When you learn something important (infrastructure, preferences, workflows, decisions, patterns), save it to memory
2. Before starting work, read relevant memory files
3. If something might be important but you're unsure, ask: "Should I remember this?"
4. Don't just document for this conversation—document for future conversations
5. Important = context, configuration, infrastructure, decisions, learned lessons, preferences, patterns, workflows

**Examples of important things**:
- System setup, architecture, infrastructure
- Configuration and how things are organized
- User preferences and how they like things done
- Decisions made and why
- Patterns and lessons learned
- Tools, access methods, credentials location
- Service locations, IPs, container IDs
- Workflows and how processes work

**Never save**:
- Current conversation context (already in history)
- One-off debug steps
- Temporary states
- Things already documented elsewhere (git, code comments, docs)

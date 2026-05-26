---
name: setup-task-learning-system
description: Capture and recall configuration artifacts from setup tasks to avoid rediscovery
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7eb63f90-4cb2-43b5-bdc0-4164335dfb96
  lastUpdated: 2026-05-26
---

## Rule: Setup Task Learning System
**Every setup task produces artifacts (bot IDs, API keys, config values) that must be captured and indexed for future recall.**

### Why:
Setup knowledge keeps getting rediscovered across sessions. Example: "What's the bot token/group ID?" after Telegram bot setup sessions. This is a waste of cognitive load when the information can be systematically captured and recalled.

### How to Apply:
1. **Before starting work in any domain**: Check `.claude/ARTIFACTS.md` first
   - If artifacts exist, load them immediately: "Found cached Telegram config (2026-05-25)"
   - If stale (>30 days), flag for refresh: "Config cached 30 days ago; shall I verify?"
   
2. **During any setup task**: Automatically extract artifacts
   - Service IDs (bot ID, client ID, API keys, tokens)
   - Endpoints (URLs, IPs, ports, hostnames)
   - Configuration (file paths, env vars, settings)
   - Relationships ("Bot X controls container Y")

3. **After setup**: Save to `.claude/setup-artifacts/<domain>/` and update `.claude/ARTIFACTS.md` index

4. **Reflect on generic problem**: "Is this a pattern? Could I automate artifact capture?"
   - Propose skill: `.claude/skills/setup-artifact-manager/` to auto-extract from setup logs

### Current Implementation
- `.claude/ARTIFACTS.md` — Master index (check first before starting work)
- `.claude/setup-artifacts/telegram/bot-config.yaml` — Telegram bot setup (group IDs, user IDs, token **reference** `$BOT_TOKEN`, config files)
  - **SECURITY**: No actual secrets stored, only references like `token_stored_as: "env var $BOT_TOKEN"`
  - Agent will use variables: `$BOT_TOKEN` (bash) or `process.env.BOT_TOKEN` (Node.js)
- `.claude/setup-artifacts/proxmox/` — (To be populated)
- `.claude/setup-artifacts/containers/` — (To be populated)

### Related
- [[CLAUDE.md § Setup Task Learning]] — Full specification in project instructions
- [[CLAUDE.md § Before Every Task]] — First step is now "Check artifacts"

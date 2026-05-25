# Setup Artifacts Index
**Auto-indexed configuration and setup state from domain setup sessions**

Check this file **before starting work in any domain**. If artifacts exist, load them to avoid rediscovery.

## Telegram Bot Artifacts
- **[Bot Configuration](setup-artifacts/telegram/bot-config.yaml)** — Token env var (BOT_TOKEN), group ID, admin user, setup files, last verified 2026-05-25
  - Group: "Va Hime" (ID: -1003951507653, forum)
  - Admin: Audrius (8176772709)
  - Token stored as env var for security

## Infrastructure Artifacts
*(To be populated as setup tasks are completed)*

### Proxmox
- Host: 192.168.50.2
- SSH key: `/root/.ssh/id_proxmox`
- Containers: CT 110 (qBittorrent), CT 112 (Claude agent), CT 101 (n8n), etc.

### Services
*(Config artifacts for integrated services — to be indexed as discovered)*

## How to Use
1. **Before starting work**: Check if domain artifacts exist here
2. **During setup**: Automatically extract and store artifacts in `setup-artifacts/<domain>/`
3. **In future sessions**: Load cached artifacts instead of rediscovering

## Example Workflow
```
User: "Set up new Telegram group for notifications"
  ↓
Agent checks: Any Telegram artifacts? Yes → Load from setup-artifacts/telegram/bot-config.yaml
  ↓
Agent displays: "Found cached bot config (created 2026-05-25). Bot token: $BOT_TOKEN, Group: Va Hime. Proceed?"
  ↓
Agent executes: Add new group to existing bot
  ↓
Agent updates: `.claude/ARTIFACTS.md` with new group info
```

## Artifact Format
Each domain artifact directory contains:
- `*.yaml` or `*.json` with configuration details
- Metadata: created date, source files, last verified, dependencies
- Relations: "This artifact depends on X", "Controls Y"
- Refresh date: When to re-validate cached information

## Stale Artifacts
If an artifact hasn't been verified in 30+ days, agent should check:
- "Cached info may be out of date. Shall I refresh?"
- Re-validate with actual system state
- Update cached artifact if changed

---
**Last updated**: 2026-05-25  
**Maintained by**: Setup Task Learning system (CLAUDE.md § Setup Task Learning)

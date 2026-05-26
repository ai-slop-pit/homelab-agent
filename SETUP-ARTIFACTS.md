# Setup Task Learning: Configuration Artifacts

**Every setup task produces artifacts** (bot IDs, API keys, config values, service URLs). These must be **automatically captured and indexed** so you never rediscover the same information twice.

## What Counts as a Setup Task?
- Telegram bot initialization, token generation
- Service integration (n8n, qBittorrent, Proxmox)
- Infrastructure provisioning (containers, networks)
- Authentication setup (SSH keys, OAuth flows)
- Configuration management (config files, env vars)

## During Setup: Extract Artifacts
Automatically capture and persist:
- **Service IDs**: Bot ID, Client ID (the non-secret parts)
- **Endpoints**: Service URLs, IPs, ports, hostnames
- **Configuration**: File paths, settings, config file locations
- **Secret References** (NOT values): "Token stored in env var `$BOT_TOKEN`" (never store the actual token)
- **Relationships**: "Bot X controls container Y on host Z"

**Storage**: `.claude/setup-artifacts/<domain>/`
- Format: `YAML` or `JSON` with metadata (created date, source, refresh date)
- **⚠️ SECURITY**: Artifacts must be safe to commit to git — NO secrets, passwords, or tokens
- Reference secrets by their storage location: `$ENV_VAR` or `./secret-file`

### Example Artifact
```yaml
# .claude/setup-artifacts/telegram/bot-config.yaml
bot_name: "homelab_agent_bot"
bot_id: "6789012345"  # public ID, safe to store
token_stored_as: "env var $BOT_TOKEN"  # reference, not the value
token_used_in: "process.env.BOT_TOKEN (Node.js) or $BOT_TOKEN (Bash)"
created: 2026-05-25
setup_session: "telegram-bot-setup-1"
relationships:
  - controls: "CT 112 (claude agent)"
  - controlled_by: "agent-state.json queue"
```

## After Setup: Index for Recall
Add a pointer to `.claude/ARTIFACTS.md` (machine-readable index):
```markdown
## Telegram Bot Artifacts
- [Bot Configuration](setup-artifacts/telegram/bot-config.yaml) — ID, token, name, created 2026-05-25
- [Webhook Config](setup-artifacts/telegram/webhook.yaml) — endpoint, port, SSL status

## Infrastructure Artifacts  
- [Proxmox SSH](setup-artifacts/proxmox/ssh-config.yaml) — host, key path, user, last verified 2026-05-25
- [CT 110 Mounts](setup-artifacts/containers/ct110-mounts.yaml) — qBittorrent volume mappings
```

## Proactive Recall: Check Artifacts First
**Before touching any domain**, check if artifacts exist:
1. "User asks for Telegram task" → Check `.claude/setup-artifacts/telegram/` first
2. If found: "Loaded bot ID `123456` from setup artifacts (cached 2026-05-25)"
3. If stale: "Bot config cached 30 days ago; may need refresh"
4. If missing: "No cached config; this is a discovery task — will capture artifacts"

## Learning Insight
Treat setup tasks as **knowledge-capture opportunities**, not just one-offs:
- Extract generic problem: "How do I reliably store + recall configuration?"
- Propose automation: "Shall I create skill `skills/setup-artifact-manager/` to auto-index all setup artifacts?"
- Track effectiveness: "Used cached artifact X times; prevented Y manual lookups"

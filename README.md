# Claude Home Assistant — CT 112

Autonomous AI agent running on LXC container 112 (Proxmox at 192.168.50.2).
Accepts tasks via Telegram or HTTP and executes them using the Claude CLI.

## Architecture

```
Telegram ──────────────────────────────────────────────────────────┐
  User message (text)                                              │
       │                                                           │
       ▼                                                           │
  Telegraf bot                                                     │
  (allowed chat gate)                                              │
       │                                                           │
       ▼                                                           │
  spawnSync("claude -p <task> --dangerously-skip-permissions")     │
       │                                                           │
       ▼                                                           │
  Split response into 4000-char chunks ─────────────────── reply to user
                                                                   │
n8n (192.168.50.153)                                               │
  POST /task { task: "..." }                                       │
       │                                                           │
       ▼                                                           │
  Express :3000 /task                                              │
       │                                                           │
       ▼                                                           │
  spawnSync("claude -p <task> --dangerously-skip-permissions")     │
       │                              │                            │
       ▼                              ▼                            │
  JSON response          sendMessage to Telegram ──────────────────┘
  { output, error }
```

## Components

| File / Dir | Purpose |
|---|---|
| `telegram-bot.js` | Single entry point: Telegraf bot + Express server |
| `hooks/post-task.sh` | Post-task hook — appends completion timestamp to daily log |
| `logs/<date>.log` | Daily execution log |
| `.learnings/` | Persistent knowledge base (MEMORY.md index + topic files) |
| `.env` | `BOT_TOKEN`, `CHAT_ID` |

## Interfaces

### Telegram bot
- `/status` — health check reply
- Any text message — forwarded to Claude CLI; response sent back (chunked if >4000 chars)
- Only messages from `CHAT_ID` are processed

### HTTP (port 3000)
- `POST /task` — body `{ "task": "..." }` — runs Claude, returns `{ output, error }`, notifies Telegram
- `GET /health` — returns `{ "status": "ok" }`

## Runtime

- Process: `node telegram-bot.js` (managed as a systemd service or PM2)
- Claude CLI invoked as the `claude` user with `HOME=/home/claude`
- Working directory: `/opt/claude-agent`
- Timeout: 5 minutes per task

## Home lab

| Host | Role |
|---|---|
| 192.168.50.2 | Proxmox hypervisor |
| 192.168.50.112 | This container (CT 112) |
| 192.168.50.153 | n8n automation server |

SSH key for outbound access: `/home/claude/.ssh/id_ed25519`

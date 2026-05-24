# Setup & Configuration

## Prerequisites

- Linux container or VM (Claude Home Assistant runs on CT 112)
- Node.js 16+ (for Telegram bot)
- Python 3.9+ (for utilities and skills)
- Claude Code CLI installed and configured
- Telegram bot token (from BotFather)

## Installation

### 1. Clone & Install Dependencies

```bash
cd /opt/claude-agent
npm install  # Installs: telegraf, express
```

### 2. Environment Variables

Create `.env` file in project root:

```bash
# Telegram Configuration
BOT_TOKEN=<your-telegram-bot-token>      # From BotFather
OWNER_ID=<your-telegram-user-id>         # Your user ID (get via /chatid command)
WIFE_ID=<wife-telegram-user-id>          # Optional: family member ID
GROUP_ID=<telegram-group-id>             # Optional: group chat for notifications

# Optional: Claude Model (default: claude-haiku-4-5-20251001)
CLAUDE_MODEL=claude-haiku-4-5-20251001

# Optional: HTTP Server Port (default: 3000)
PORT=3000
```

**Getting IDs**:
1. Start bot: `npm start`
2. Send `/chatid` command
3. Bot replies with your Chat ID and User ID

### 3. Make Scripts Executable

```bash
chmod +x ./.claude/task-runner.sh
chmod +x ./.claude/approval-gate.sh
chmod +x ./.claude/agent-state-utils.py
```

### 4. Create Log Directory

```bash
mkdir -p logs
```

## Running the Agent

### Option A: One-Off Execution (Manual)

```bash
# Add a task
python3 ./.claude/agent-state-utils.py add-task cli user query "weather" research false normal

# Execute it
./.claude/task-runner.sh run

# Check result
python3 ./.claude/agent-state-utils.py list-completed
```

### Option B: Continuous Autonomous Loop

```bash
# Run forever (5s polling, logs to logs/task-runner-YYYY-MM-DD.log)
./.claude/task-runner.sh loop 0 &

# Or in a tmux session
tmux new-session -d -s agent "./.claude/task-runner.sh loop 0"

# Check status
tmux capture-pane -t agent -p
```

### Option C: Systemd Service (Recommended for Production)

Create `/etc/systemd/system/claude-agent.service`:

```ini
[Unit]
Description=Claude Home Assistant
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=claude
WorkingDirectory=/opt/claude-agent
Environment="HOME=/home/claude"
ExecStart=/opt/claude-agent/.claude/task-runner.sh loop 0
Restart=always
RestartSec=10

# Optional: capture stdout to log
StandardOutput=append:/opt/claude-agent/logs/agent-systemd.log
StandardError=append:/opt/claude-agent/logs/agent-systemd.log

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable claude-agent
sudo systemctl start claude-agent

# Check status
sudo systemctl status claude-agent
systemctl logs -u claude-agent -f
```

### Option D: PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'claude-task-runner',
      script: './.claude/task-runner.sh',
      args: 'loop 0',
      cwd: '/opt/claude-agent',
      user: 'claude',
      env: {
        HOME: '/home/claude'
      },
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'claude-telegram-bot',
      script: 'telegram-bot.js',
      cwd: '/opt/claude-agent',
      user: 'claude',
      env: {
        HOME: '/home/claude',
        NODE_ENV: 'production'
      },
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/telegram-error.log',
      out_file: './logs/telegram-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status
pm2 logs

# Save PM2 process list
pm2 save
sudo env PATH=$PATH:/usr/local/bin pm2 startup -u claude --hp /home/claude
```

## Configuration

### CLAUDE.md Project Instructions

The `.claude.md` file contains agent-specific instructions. Key sections:

```markdown
## Vision: One Unified Agent Brain
The agent operates as a single persistent intelligence...

## Architecture: One Brain, Multiple Layers
[Diagram showing interfaces]

## Skills Framework
- research: Deep web research with Gemini
- reminder-engine: TODO (Phase 2)
- home-automation: TODO (Phase 2)
...

## Approval Rules
- All Telegram submissions require approval by default
- Destructive operations (delete, drop, etc.) always require approval
- CLI tasks can execute immediately (owner is trusted)
```

### Approval Rules Customization

Edit `.claude/task-runner.sh` to adjust approval behavior:

```bash
# Destructive keyword detection
function isDestructiveTask() {
    local task="$1"
    local destructive_keywords="delete drop destroy rm kill power off reset format"
    # Add/remove keywords as needed
}

# In telegram-bot.js, adjust approval requirement
const requiresApproval = isDestructive || !isOwner(userId);
// Change logic here for different approval models
```

### Skill Configuration

Each skill may have configuration. Examples:

**Research Skill** (`./.claude/skills/research/`):
```bash
# Uses Gemini by default, can override
GEMINI_MODEL=gemini-3.5-flash
RESEARCH_TIMEOUT=300
```

**Home Automation Skill** (`./.claude/skills/home-automation/`):
```bash
# Proxmox API
PROXMOX_HOST=192.168.50.2
PROXMOX_USER=root@pam
PROXMOX_TOKEN=/root/.ssh/id_proxmox

# n8n API
N8N_HOST=192.168.50.153
N8N_PORT=5678
```

## Network & Security

### Firewall

```bash
# Allow Telegram (outbound only)
sudo ufw allow out to any port 443  # HTTPS for Telegram API

# Allow n8n communication
sudo ufw allow in from 192.168.50.153 to any port 3000
```

### SSH Keys

The agent uses SSH keys for remote access:

```bash
# Claude user SSH key (for LXC to LXC)
ls -la /home/claude/.ssh/id_ed25519

# Root SSH key (for Proxmox access)
ls -la /root/.ssh/id_proxmox
```

Ensure keys have correct permissions:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_*
chmod 644 ~/.ssh/*.pub
```

### Telegram Bot Security

```bash
# Only specific user IDs can submit commands
OWNER_ID=<your-id>           # Full access
WIFE_ID=<wife-id>            # Task submission (requires approval)

# Group chat can also submit
GROUP_ID=<group-id>          # Group members can submit (requires approval)

# Non-registered users are ignored
```

## Verification

### Test the Whole Pipeline

```bash
# 1. Check shared state exists and is valid
cat .claude/agent-state.json | python3 -m json.tool > /dev/null && echo "✅ State valid"

# 2. Test adding a task
TASK_ID=$(python3 ./.claude/agent-state-utils.py add-task cli user query "test" research false normal)
echo "Created: $TASK_ID"

# 3. Check it's in pending
python3 ./.claude/agent-state-utils.py list-pending | jq '.[] | {id, status}'

# 4. Run task-runner once
./.claude/task-runner.sh run

# 5. Check it's completed
python3 ./.claude/agent-state-utils.py list-completed | jq '.[-1] | {id, status, result}'

# 6. Test Telegram bot (if configured)
npm start &
# Send message to bot, verify response

# 7. Test HTTP API
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

### Health Check

```bash
# Check all components
echo "=== Agent State ===" && \
  cat .claude/agent-state.json | python3 -m json.tool | head -5 && \
echo "=== Pending Tasks ===" && \
  python3 ./.claude/agent-state-utils.py list-pending | jq 'length' && \
echo "=== Recent Logs ===" && \
  tail -3 logs/task-runner-*.log && \
echo "✅ All checks passed"
```

## Troubleshooting Installation

### Issue: "agent-state.json not found"

```bash
# Initialize shared state
python3 ./.claude/agent-state-utils.py set-state idle
# This creates .claude/agent-state.json with default structure
```

### Issue: "Permission denied" on scripts

```bash
# Make scripts executable
chmod +x ./.claude/*.sh
chmod +x ./.claude/*.py
```

### Issue: "BOT_TOKEN not set"

```bash
# Create .env file
echo "BOT_TOKEN=<your-token>" > .env
echo "OWNER_ID=<your-id>" >> .env
source .env
npm start
```

### Issue: Telegram bot doesn't respond

1. Verify BOT_TOKEN is correct
2. Check `/chatid` command to get your ID
3. Verify OWNER_ID or WIFE_ID matches your ID
4. Check logs: `npm start` (should show connection)

## Backup Strategy

### Daily Backup

```bash
# Backup agent state
cp .claude/agent-state.json backups/agent-state-$(date +%Y%m%d).json

# Or automated via cron
0 2 * * * cd /opt/claude-agent && cp .claude/agent-state.json backups/agent-state-$(date +\%Y\%m\%d).json
```

### Full Backup

```bash
# Backup everything except node_modules
tar czf claude-agent-backup-$(date +%Y%m%d).tar.gz \
  --exclude node_modules \
  --exclude logs \
  .
```

### Restore from Backup

```bash
# Restore state file
cp backups/agent-state-YYYYMMDD.json .claude/agent-state.json

# Or restore everything
tar xzf claude-agent-backup-YYYYMMDD.tar.gz
```

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure: Create `.env` with BOT_TOKEN and IDs
3. ✅ Test: Run `./.claude/task-runner.sh run`
4. ✅ Deploy: Use systemd service or PM2
5. 📖 Learn: Read [USAGE.md](USAGE.md) for interface guide
6. 🔧 Extend: Check [DEVELOPMENT.md](DEVELOPMENT.md) for adding skills

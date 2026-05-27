# Claude Home Agent — CT 112

Autonomous homelab assistant that learns by working.

## What It Does

- **Executes** tasks via Claude Code CLI
- **Learns** patterns from work via memory and skills
- **Evolves** by extracting reusable automation

## Prerequisites

Before getting started, ensure you have the following installed:

- **Operating System**: Linux, macOS, or WSL (Windows Subsystem for Linux)
- **Node.js**: v18+ and npm (for running Claude Code CLI)
- **Git**: v2.30+ for version control
- **Claude Code CLI**: Installed via `npm install -g @anthropic-ai/claude-code` or following [Claude's installation guide](https://claude.ai/docs/install)
- **GitHub CLI** (`gh`): For project board management (install via [github.com/cli/cli](https://github.com/cli/cli))
- **Disk Space**: ~500MB for agent installation and memory files
- **Network**: Internet access for Claude API calls and GitHub operations

### Optional Dependencies

- **Python**: If using Python-based skills (not required for core agent)
- **Docker/Containerd**: If managing containers via Proxmox integration

## Quick Start

This is a Node.js CLI wrapper around Claude Code. You invoke it directly via the `claude` command, not through npm.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ai-slop-pit/homelab-agent.git
   cd homelab-agent
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the agent directly**:
   ```bash
   # For general operations, use Claude Code CLI
   claude
   
   # Check agent's learnings
   cat /opt/claude-agent/memory/MEMORY.md
   ```

### Running Sub-Agents

The agent system includes specialized sub-agents for different roles:

**Dev Agent** — Handles implementation, PR creation, and code reviews:
```bash
# Poll and claim a task from the project board
claude dev-agent poll

# Implement a specific issue
claude dev-agent implement <issue-number>

# Create a pull request for completed work
claude dev-agent create-pr
```

**PO Agent** — Manages prioritization, trend research, and pull request reviews:
```bash
# Monitor the project board for updates
claude po-agent monitor

# Prioritize and organize issues
claude po-agent prioritize

# Review and approve pull requests
claude po-agent review-pr <pr-number>
```

See [.claude/agents/dev-agent.md](.claude/agents/dev-agent.md) and [.claude/agents/po-agent.md](.claude/agents/po-agent.md) for detailed workflow documentation.

## Documentation

Start here for understanding the agent:

1. **[README.md](README.md)** — This file. Setup, quickstart, and structure.
2. **[CLAUDE.md](CLAUDE.md)** — Core philosophy, learning loop, and operating principles.
3. **[SOUL.md](SOUL.md)** — Agent personality, communication style, and behavioral boundaries.

### Skills Reference

The agent grows its toolkit through work. Available skills:

- **skill-creator** — Pattern detection and autonomous skill development
- **infrastructure** — Unified Proxmox container and hardware management
- **memory-manager** — Persistent learning storage and retrieval
- **investigate** — Research, validation, and evidence gathering
- **agent-versioning** — Atomic commits and release tracking
- **update-config** — Configuration management and hooks
- **verify** — Test and validate code changes
- **code-review** — Automated code quality analysis
- **claude-api** — Claude API and Anthropic SDK integration
- **run** — Launch and drive the project app

## Project Structure

```
homelab-agent/
├── README.md                    # This file
├── CLAUDE.md                    # Core philosophy and learning loop
├── SOUL.md                      # Agent identity and behavior
├── MEMORY.md                    # Persistent learnings and context
├── .claude/
│   ├── agents/
│   │   ├── dev-agent.md        # Dev sub-agent workflow
│   │   └── po-agent.md         # PO sub-agent workflow
│   └── skills/                  # Growing toolkit (auto-managed)
└── memory/
    └── MEMORY.md               # Shared learnings across sessions
```

## Memory & Learning

Agent learnings live in `/opt/claude-agent/memory/MEMORY.md`. This file contains:

- **User profile** — Preferences, feedback, constraints
- **Project context** — Goals, architecture, ongoing work
- **Infrastructure facts** — System configuration, services, credentials (references only)
- **Patterns & skills** — Reusable solutions discovered through work
- **Session history** — Recent work, blockers, decisions

### Memory Format

Memory uses a simple markdown structure with metadata:

```markdown
## [Topic]

**Date**: YYYY-MM-DD  
**Source**: Where this info came from  
**Tags**: category, tag1, tag2  

Description and details here.

### Example or Context
- Bullet points
- Code snippets if relevant
```

To add memory:
1. Open `/opt/claude-agent/memory/MEMORY.md`
2. Add a new section with date, source, and tags
3. Document the discovery or learning
4. Commit with a message explaining the learning

Memory is not write-only — review it at the start of each session to understand context and constraints.

## Troubleshooting

### "Command not found: claude"

The Claude Code CLI isn't in your PATH. Ensure it's installed globally:
```bash
npm list -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code
```

### "Permission denied" when accessing memory files

Check file permissions and fix as needed:
```bash
chmod -R 755 /opt/claude-agent/memory/
chmod 644 /opt/claude-agent/memory/MEMORY.md
```

### "gh command not found"

GitHub CLI isn't installed. Install it from [github.com/cli/cli](https://github.com/cli/cli) or via your package manager:
```bash
# macOS
brew install gh

# Linux (Ubuntu/Debian)
sudo apt install gh

# Linux (Fedora/RHEL)
sudo dnf install gh
```

### "Memory file not found" error

Initialize memory if it's missing:
```bash
mkdir -p /opt/claude-agent/memory
touch /opt/claude-agent/memory/MEMORY.md
echo "# Agent Memory Index" > /opt/claude-agent/memory/MEMORY.md
```

### API rate limiting or timeouts

The agent may hit GitHub or Claude API limits. Solutions:
- Wait 1-2 minutes before retrying
- Check GitHub status at [github.status.io](https://www.githubstatus.com)
- Check Anthropic status at [status.anthropic.com](https://status.anthropic.com)
- Review rate limit info: `gh rate-limit`

### SSH/Git authentication failures

Ensure GitHub authentication is set up:
```bash
# Authenticate with GitHub
gh auth login

# Test SSH key (if using SSH)
ssh -T git@github.com
```

### Debug mode

Enable verbose logging:
```bash
DEBUG=* claude [command]
```

## FAQ

**Q: Is this a Node.js project?**  
A: Yes, it's a wrapper around Claude Code CLI. The agent itself runs on your local machine using Node.js and communicates with Claude via API.

**Q: Can I run this on Windows?**  
A: Yes, if you have WSL (Windows Subsystem for Linux) installed and configured with Node.js and Git.

**Q: How does the learning loop work?**  
A: See [CLAUDE.md](CLAUDE.md) for the complete philosophy. In short: Do work → Reflect on what you solved → Extract reusable patterns → Evolve the toolkit.

**Q: Where do new skills come from?**  
A: Skills emerge from work through the `skill-creator` tool. When the agent spots a repeating pattern, it extracts the logic into a reusable skill and commits it to the repository.

**Q: How do I update or modify my preferences?**  
A: Edit `/opt/claude-agent/memory/MEMORY.md` directly or use the agent to update it during conversation. Changes are automatically persisted.

**Q: What should I do if something breaks?**  
A: Check the Troubleshooting section above. If that doesn't help, open an issue on the GitHub project board.

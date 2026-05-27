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

See [.claude/agents/dev-agent.md](.claude/agents/dev-agent.md) and [.claude/agents/po-agent.md](.claude/agents/po-agent.md) for detailed workflow documentation, including:
- **Dev Agent**: Polling, claiming issues, implementation procedures, PR creation, blocker/clarification handling
- **PO Agent**: Prioritization, PR review, feedback management, worktree cleanup

## Documentation

Start here for understanding the agent:

1. **[README.md](README.md)** — This file. Setup, quickstart, and structure.
2. **[CLAUDE.md](CLAUDE.md)** — Core philosophy, learning loop, and operating principles.
3. **[SOUL.md](SOUL.md)** — Agent personality, communication style, and behavioral boundaries.

### Agent Architecture & Decision-Making

The agent system consists of specialized sub-agents that coordinate work:

- **Main Agent** — Reasoning, planning, task direction
- **Dev Agent** (`.claude/agents/dev-agent.md`) — Implementation, PR creation, issue claiming
- **PO Agent** (`.claude/agents/po-agent.md`) — Prioritization, reviews, worktree cleanup

Each agent has clear responsibilities and decision points. See the linked agent documentation for detailed workflows, state transitions, and coordination protocols.

### Skills Reference

The agent grows its toolkit through work. Each skill is autonomous and addresses a specific problem domain.

#### Learning & System Skills

When to use each:

| Skill | Purpose | When to Use |
|-------|---------|-----------|
| **skill-creator** | Extract repeating patterns into reusable skills | Detected 3+ instances of same problem |
| **memory-manager** | Manage persistent learnings in MEMORY.md | Starting work (read) or after discovery (write) |
| **investigate** | Research with validation and citations | Need answer to any question (events, research, debug) |
| **agent-versioning** | Create atomic commits capturing milestones | Work complete (feature done, capability added) |

#### Development & Operations Skills

| Skill | Purpose | When to Use |
|-------|---------|-----------|
| **infrastructure** | Proxmox container/hardware management | Need system info, service management, container ops |
| **verify** | Test & validate code in running environment | Confirm fix works, test features, validate before push |
| **code-review** | Analyze code for correctness & efficiency | Run quality checks on diffs before merge |
| **claude-api** | Build/debug Claude API with caching | SDK/API projects needing Anthropic integration |
| **run** | Launch app and drive manual testing | See changes working in the real application |

#### Configuration & Customization Skills

| Skill | Purpose | When to Use |
|-------|---------|-----------|
| **update-config** | Configure harness via settings.json | Set permissions, env vars, hooks, automated behaviors |
| **keybindings-help** | Customize keyboard shortcuts | Rebind keys or add chord shortcuts |

#### Utility Skills

| Skill | Purpose | When to Use |
|-------|---------|-----------|
| **simplify** | Apply code cleanups and optimizations | Same as code-review with automatic fixes |
| **loop** | Run prompt/command on recurring interval | Set up recurring tasks, status polling, repeating checks |
| **schedule** | Manage scheduled remote agents (cron) | Schedule recurring remote agents, one-time runs, reminders |

### Advanced Topics

For deeper understanding of specific areas:

- **[CLAUDE.md](CLAUDE.md)** — Core learning loop, system philosophy, why the agent evolves through work
- **[SOUL.md](SOUL.md)** — Identity, values, behavioral boundaries, personality traits
- **[Dev Agent Workflow](.claude/agents/dev-agent.md)** — Task claiming, implementation procedures, PR creation, blocker/clarification handling
- **[PO Agent Workflow](.claude/agents/po-agent.md)** — Prioritization, PR review, feedback management, worktree cleanup

#### Architecture Diagrams

**Learning Loop** (from CLAUDE.md):
```
Do → Reflect → Distill → Evolve → Repeat
```

**Agent System**:
```
User
  ↓
Main Agent (reasoning & planning)
  ├→ Dev Agent (implementation)
  ├→ PO Agent (reviews & prioritization)
  ↓
GitHub Issues, PRs, Project Board
  ↓
Skills Toolkit (grows from work)
  ↓
Memory (persistent learnings)
```

**GitHub Project Board** (8-column state machine):
```
Backlog → Todo → In Progress ↘
                              Blocked
                              ↓
                              Needs Clarification
                              ↓
                              Needs User Approval
                              ↓
                              In Review → Done
```

See [GitHub Project Board Workflow](#github-project-board-workflow) section below for detailed transitions.

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

Agent learnings live in `/opt/claude-agent/memory/MEMORY.md`. This file is the agent's persistent brain across sessions, storing everything from user preferences to infrastructure facts to discovered patterns. It persists across all sessions and conversations.

### What Lives in Memory

Memory is organized by type and lifecycle:

| Type | Purpose | Example | Frequency |
|------|---------|---------|-----------|
| **User Profile** | Preferences, constraints, communication style | "User prefers async updates", "Avoid destructive operations without confirmation" | Updated quarterly |
| **Infrastructure Facts** | System configuration, services, networking | "Proxmox node at 192.168.50.10", "qBittorrent runs on container plex-1" | Updated as systems change |
| **Project Context** | Goals, architecture decisions, ongoing work | "Phase 2: Skills should emerge from work", "Dev agent is single-threaded" | Updated per phase |
| **Patterns & Skills** | Reusable solutions discovered through work | "3+ instances of X problem → extract to skill-creator" | As patterns emerge |
| **Session History** | Recent work, blockers, decisions | "PR #42 blocked on review", "Issue #5 needs clarification" | Updated per session |
| **Learnings** | Discoveries and insights from completed work | "Worktree cleanup must happen after merge", "GitHub API has 60req/hr limit for non-auth calls" | Added after discovery |

### Memory Format & Structure

Memory uses a structured markdown format for consistency and searchability. Each entry follows this template:

```markdown
## [Topic Title]

**Date**: YYYY-MM-DD  
**Source**: Where this came from (user feedback, discovered during work, etc.)  
**Tags**: category, tag1, tag2  
**Status**: Active | Archived  
**Priority**: High | Medium | Low

Description and details. Can be multiple paragraphs.

### Context or Examples
- Bullet point 1
- Bullet point 2
- Code snippet if relevant:
  ```bash
  command example
  ```

### Related Topics
- Link to other memory sections if relevant
```

**Field Definitions**:
- **Date**: When this was added (helps track currency)
- **Source**: Where it came from (user feedback, bug discovery, test results, etc.)
- **Tags**: Searchable categories for quick lookup (git, workflow, infrastructure, skills, etc.)
- **Status**: `Active` = current information, `Archived` = no longer relevant but kept for history
- **Priority**: `High` = critical for operations, `Medium` = useful context, `Low` = nice-to-know

### Memory Lifecycle

**Reading Memory** (start of work):
1. At the start of every session, read `/opt/claude-agent/memory/MEMORY.md`
2. Identify sections marked `Active` with tags relevant to your task
3. Understand active constraints, ongoing decisions, and discovered patterns
4. Reference relevant sections during work to make informed decisions

**Writing Memory** (after discovery):
1. After completing a task, review what you learned
2. Identify reusable patterns, infrastructure facts, or user preferences discovered
3. Add a new section to MEMORY.md with date, source, tags, and description
4. Commit the memory update: `git add memory/MEMORY.md && git commit -m "memory: [what you learned]"`

**Updating Memory** (contradiction or evolution):
1. If you learn something contradicts existing memory, update the relevant section
2. Change status to "Archived" for outdated information rather than deleting
3. Reference the session/task that prompted the update
4. Keep historical context for future reference

### Memory Access from Code

When working in agent code or procedures:

```bash
# Read memory at session start
cat /opt/claude-agent/memory/MEMORY.md

# Add a new memory entry after discovery
# 1. Edit the file
nano /opt/claude-agent/memory/MEMORY.md

# 2. Stage and commit
git add /opt/claude-agent/memory/MEMORY.md
git commit -m "memory: Document [what you learned]"
```

### Example: Memory Workflow

**Scenario**: You discover that the Dev agent's worktree workflow has a critical step.

1. During work, you notice: "Worktrees should be cleaned up after PR merge, not before"
2. After completing the fix, add to memory:
   ```markdown
   ## Git Worktree Cleanup Timing
   
   **Date**: 2026-05-27
   **Source**: Issue #11 implementation (dev-agent-workflow)
   **Tags**: git, workflow, worktree, process, critical
   **Status**: Active
   **Priority**: High
   
   Worktree cleanup must occur AFTER the feature branch is merged to main, not before. 
   This prevents accidental loss of work if the merge fails.
   
   ### Correct Timeline
   1. Dev creates PR with worktree attached
   2. PO reviews and approves PR in GitHub
   3. PO merges PR to main
   4. PO cleans up worktree (after confirmed merge)
   
   ### Why This Order
   - Worktree contains the feature branch
   - If merge fails, dev needs to re-push or investigate
   - Cleaning before merge risks losing work
   
   ### Related Topics
   - PR Creation procedure (dev-agent.md)
   - PO agent cleanup responsibilities
   ```
3. Commit with meaningful message: `git commit -m "memory: Document worktree cleanup after merge"`

## GitHub Project Board Workflow

The project uses a GitHub Project board as the task management system. The board is an 8-column state machine that tracks work from idea through completion.

### Board Columns (Workflow States)

1. **Backlog** — Ideas and planned work not yet prioritized
   - Entry point for new issues
   - Issues can be created by user or agent
   - Used for long-term planning and quarterly planning

2. **Todo** — Prioritized work ready for the Dev agent to claim
   - Issues are actively being considered for next sprint
   - Dev agent polls this column and claims the first unassigned issue
   - Issues should have clear acceptance criteria and no blockers

3. **In Progress** — Dev agent is actively implementing
   - Issue is claimed by Dev agent
   - Dev agent creates a worktree and begins implementation
   - Dev comments with status updates if work takes time

4. **Blocked** — Work stopped due to external dependency
   - Dev agent moves issue here when a blocker is discovered
   - Blockers include: missing data, PO decision needed, external service down, conflicting requirement
   - Dev agent comments with blocker reason and @PO-Agent
   - PO agent investigates and either resolves or documents the blocker
   - Issue moves back to In Progress when unblocked

5. **Needs Clarification** — Requirement is ambiguous or incomplete
   - Dev agent moves issue here when specification is unclear
   - Dev agent comments with specific questions for PO
   - PO agent clarifies requirements in a comment
   - When clarified, PO agent moves back to In Progress

6. **Needs User Approval** — Breaking change or high-risk decision
   - Dev agent moves issue here when implementation has significant impact
   - Examples: breaking API changes, data migrations, system restarts
   - Dev agent comments with impact analysis and awaits user decision
   - User approves/rejects in comment; PO agent moves back to In Progress or Backlog

7. **In Review** — PR created, awaiting PO review
   - Dev agent moves issue here after creating a PR
   - Dev agent comments: "Task complete. Implementation: PR #XXX"
   - PO agent reviews code, tests, and acceptance criteria
   - PO agent either requests changes (comments on PR) or approves

8. **Done** — Work complete and merged
   - PO agent moves issue here after merging the PR
   - Final state; issue is considered resolved
   - Worktree cleanup handled by PO agent post-merge

### State Machine Diagram

```
Backlog → Todo → In Progress ↘
                              Blocked → (resolved) → In Progress
                              ↓
                              Needs Clarification → (clarified) → In Progress
                              ↓
                              Needs User Approval → (approved) → In Progress
                              ↓
                              In Review → (approved) → Done
                              ↓
                              (rejected) → Backlog
```

### Typical Workflow: Feature Implementation

1. **User creates issue** in Backlog with description and acceptance criteria
2. **PO agent prioritizes**: moves to Todo when ready to start
3. **Dev agent polls**: claims first unassigned Todo issue
4. **Dev agent comments**: "Taking this on. Starting implementation."
5. **Dev agent works**:
   - Creates worktree: `git worktree add -b docs/issue-<num>-<title>`
   - Implements feature
   - Tests changes
   - Commits: atomic, issue-focused commits
6. **Dev agent creates PR**:
   - Comments on issue: "Task complete. Implementation: PR #XXX"
   - Moves issue to In Review
7. **PO agent reviews**:
   - Checks code quality, tests, acceptance criteria
   - Approves or requests changes
   - If approved: merges PR, moves issue to Done
8. **PO agent cleanup**: removes worktree after merge

### Issue Transitions & Responsibilities

| Transition | Owner | Action |
|-----------|-------|--------|
| Backlog → Todo | PO Agent | Prioritize, refine requirements |
| Todo → In Progress | Dev Agent | Claim issue, start implementation |
| In Progress → Blocked | Dev Agent | Identify blocker, comment with reason |
| Blocked → In Progress | PO Agent | Resolve blocker, move issue back |
| In Progress → Needs Clarification | Dev Agent | Request clarification, comment questions |
| Needs Clarification → In Progress | PO Agent | Answer questions, move issue back |
| In Progress → Needs User Approval | Dev Agent | Flag risk/breaking change, await approval |
| Needs User Approval → In Progress | User/Dev | User approves in comment, move back |
| In Progress → In Review | Dev Agent | Create PR, comment with PR link |
| In Review → Done | PO Agent | Approve & merge PR, move to Done |
| In Review → Backlog | PO Agent | Reject implementation, move back |

### Column Monitoring

**Dev Agent**:
- Polls Todo column every session to claim new work
- Monitors own In Progress issues for feedback
- Comments on Blocked/Clarification issues when waiting

**PO Agent**:
- Monitors Blocked column for unresolved blockers
- Reviews PRs and approves/rejects in In Review
- Moves Done issues after merge and cleanup

**User**:
- Adds new issues to Backlog
- Responds to Needs User Approval comments
- Reviews Done issues for correctness

## Quick Reference

### Command Summary

**For Users**:
```bash
# Start interactive Claude Code session
claude

# View agent learnings
cat /opt/claude-agent/memory/MEMORY.md

# Check recent commits
git log --oneline -10
```

**For Dev Agent**:
```bash
# Poll and claim a task
claude dev poll

# Create a worktree for an issue
git worktree add -b docs/issue-<NUM>-<title> /tmp/wt-issue-<NUM> origin/main

# Switch to worktree and work
cd /tmp/wt-issue-<NUM>
# ... make changes, test, commit ...

# Push branch and create PR
git push origin docs/issue-<NUM>-<title>
gh pr create --title "..." --body "..."
```

**For PO Agent**:
```bash
# Monitor project board
gh project view --owner ai-slop-pit --format json

# Review PR
gh pr view <NUM> --web

# Merge PR
gh pr merge <NUM> --merge

# Clean up worktree
git worktree remove /tmp/wt-issue-<NUM>
```

### File Locations Reference

| Path | Purpose | Owner |
|------|---------|-------|
| `/opt/claude-agent/` | Agent repository root | Shared |
| `/opt/claude-agent/README.md` | Main documentation (this file) | Shared |
| `/opt/claude-agent/CLAUDE.md` | Core philosophy and learning loop | Main agent |
| `/opt/claude-agent/SOUL.md` | Agent identity and values | Main agent |
| `/opt/claude-agent/memory/MEMORY.md` | Persistent learnings | All agents |
| `/opt/claude-agent/.claude/agents/dev-agent.md` | Dev agent procedures | Dev agent |
| `/opt/claude-agent/.claude/agents/po-agent.md` | PO agent procedures | PO agent |
| `/tmp/wt-issue-<NUM>/` | Worktree for issue work | Dev agent |

### Decision Tree: Is This a Blocker?

When Dev agent encounters an issue:

```
Can I implement this? 
  → NO: External dependency, missing data, or conflicting requirement
       → Move to Blocked column, comment with reason
  → YES: Is the requirement clear?
       → NO: Specification is ambiguous or incomplete
            → Move to Needs Clarification column, comment with questions
       → YES: Is this a breaking change or high-risk?
              → YES: Breaking API, data migration, system restart
                     → Move to Needs User Approval column, await decision
              → NO: Proceed with implementation
```

### GitHub Project Board State Quick Reference

| Column | Owner | Entry Point | Exit Condition | Next State |
|--------|-------|-------------|----------------|-----------|
| **Backlog** | User/PO | New issues | Ready to start | Todo |
| **Todo** | Dev | Claims issue | Starts work | In Progress |
| **In Progress** | Dev | Implementing | Ready for review | In Review |
| **Blocked** | Dev | Blocker found | Unblocked by PO | In Progress |
| **Needs Clarification** | Dev | Unclear spec | Clarified by PO | In Progress |
| **Needs User Approval** | Dev | Breaking change | Approved/rejected | In Progress / Backlog |
| **In Review** | PO | PR created | Review complete | Done / Backlog |
| **Done** | PO | Merged PR | Final state | (end) |

### Skill Selection Matrix

Need to...? Use this skill:

| Need | Skill | Why |
|------|-------|-----|
| Extract a repeating pattern | skill-creator | Automates what you've done 3+ times |
| Save a discovery or learning | memory-manager | Persists across sessions |
| Research a question | investigate | Validates with sources |
| Mark work complete | agent-versioning | Captures evolution |
| Check system status | infrastructure | Unified Proxmox access |
| Validate code works | verify | Test in running environment |
| Find code bugs/issues | code-review | Automated quality checks |
| Build API integrations | claude-api | SDK/caching support |
| Test a feature | run | Real app testing |
| Set up automation | update-config | Harness configuration |
| Change hotkeys | keybindings-help | Keyboard customization |
| Run recurring task | loop | Interval-based automation |
| Schedule remote task | schedule | Cron/scheduled agents |
| Quick apply fixes | simplify | Same as code-review with auto-apply |

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

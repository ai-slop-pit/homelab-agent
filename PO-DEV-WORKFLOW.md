# CT 112 Sub-Agents

Two independent sub-agents coordinate via GitHub Project board to manage CT 112's evolution.

## Quick Start

**PO Agent** (Product Owner):
```bash
cd /opt/claude-agent
claude po-agent monitor          # Check health, file issues
claude po-agent prioritize       # Order backlog
claude po-agent review-pr        # Review Dev's PR
```

**Dev Agent** (Developer):
```bash
cd /opt/claude-agent
claude dev-agent poll            # Find and claim Todo items
claude dev-agent implement <#>   # Work on issue
claude dev-agent create-pr       # Create PR when done
```

## Architecture

```
GitHub Project Board (8 columns)
├─ Backlog          (PO creates)
├─ Todo             (PO prioritizes, Dev claims)
├─ In Progress      (Dev working)
├─ Blocked          (Dev reports blocker)
├─ Needs Clarification (Dev requests clarification)
├─ Needs User Approval (Dev requests user approval)
├─ In Review        (Dev created PR, PO reviews)
└─ Done             (PO approved and merged)

PO Agent ←→ GitHub Project ←→ Dev Agent
                 ↓
            User Approvals
            (manual moves)
```

## Procedures

See:
- **po-agent-procedures.md** — PO procedures (MONITOR, RESEARCH, PRIORITIZE, REVIEW_PR, UNBLOCK, CLARIFY)
- **dev-agent-procedures.md** — Dev procedures (POLL, IMPLEMENT, CREATE_PR, RESPOND_TO_FEEDBACK, HANDLE_BLOCKER, HANDLE_CLARIFICATION, HANDLE_USER_APPROVAL)

## Files

- `po-agent.md` — PO Agent definition
- `dev-agent.md` — Dev Agent definition
- `po-agent-procedures.md` — PO procedures
- `dev-agent-procedures.md` — Dev procedures
- `README.md` — This file

## Communication

- **PO ↔ Dev**: GitHub Issues, PRs, Project board
- **Dev → User**: Issue comments (approval requests)
- **User → Dev**: Issue comments (decisions, approvals)
- **Both**: Shared memory at `/opt/claude-agent/memory/`

## Key Principle

GitHub Project board is the single source of truth. All coordination happens via Issues, PRs, and board columns. No direct agent-to-agent communication needed—async via GitHub.

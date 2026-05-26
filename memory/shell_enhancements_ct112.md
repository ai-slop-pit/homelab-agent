---
name: shell_enhancements_ct112
description: "Enhanced bash shell in CT 112 with history, autocomplete, and command help tools"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5243fa61-14c1-42e6-bc4a-9ac20915a198
---

# CT 112 Shell Enhancements (2026-05-26)

Enhanced `/root/.bashrc` with tools to improve command discovery and productivity.

## Installed Tools

**bash-completion** (pre-installed)
- Tab autocomplete for commands, files, arguments
- Works automatically when you press TAB

**fzf** (fuzzy finder)
- Ctrl+R to fuzzy-search entire command history
- Start typing to filter → arrow keys to select → Enter to run
- Much faster than scrolling through `history`

**cheat.sh integration** (via curl)
- `? <command>` — Quick cheat sheet for any command
- `help <command>` — Alias for same thing
- Examples:
  - `? tmux` → shows tmux sessions, windows, panes, keybindings
  - `? docker` → docker quick reference
  - `? git` → git command examples
  - `? ssh` → ssh usage patterns

## Enhanced History

Configured in bashrc:
- **HISTSIZE=10000** — Keep 10,000 commands in memory
- **HISTFILESIZE=20000** — Store 20,000 in history file
- **HISTTIMEFORMAT** — Shows when each command was run
- **Real-time sync** — History saved after every command (not just on exit)
- **Deduplication** — Removes duplicates automatically

## Useful Aliases

- `h` — Last 20 commands
- `hg` — Grep history (e.g., `hg docker`)
- `ll` — Detailed file listing
- `cls` — Clear screen

## How to Use

**Type partial command + TAB:**
```bash
docker ps
       ↑ auto-completes to 'ps' or similar subcommands
```

**Fuzzy search history with Ctrl+R:**
```bash
Ctrl+R → type "tmux" → see all tmux commands from history → select one
```

**Find command examples:**
```bash
? tmux              # What can I do with tmux?
help docker logs    # How does docker logs work?
? ssh -p            # SSH port forwarding examples
```

## Status

All tools active and working in CT 112 container. Bashrc configured for persistence across sessions.

# Research & Context Access Skill

## How to Check Information

### 1. Local Project Knowledge
- **CLAUDE.md** — Project rules and architecture
- **README** — Project overview
- **docs/** — Detailed documentation
- **Code files** — Read with `Read` tool

**Usage**: Direct file reading when info is in the project.

### 2. Git History & Changes
- **git log** — See how things evolved
- **git blame** — Who changed what
- **git show** — Specific commit details

**Usage**: Understand decisions, changes, and history.

### 3. Agent Memory
- **~/.claude/projects/*/memory/** — Project patterns and lessons
- Persistent knowledge across sessions

**Usage**: Recall patterns, lessons learned, system understanding.

### 4. Web Research & External Context
- **`gemini` command** — Web research, current information
- Set: `export GEMINI_CLI_TRUST_WORKSPACE=true`

**Usage**: Look up current facts, APIs, versions, external context
```bash
gemini "what's the latest Node.js LTS release"
```

## How to Offload Context

### 1. Persistent Sessions (tmux)
- Run long tasks in background
- Check progress anytime
- Share output with user

**Commands**:
```bash
tmux new-session -d -s <name> <command>
tmux capture-pane -t <name> -p              # View output
tmux kill-session -t <name>                 # Stop
```

### 2. Agent State Queue
- Register tasks in `.claude/agent-state.json`
- Telegram bot can query/approve
- Async task tracking

### 3. File-Based Results
- Save analysis to files
- User reviews later
- No blocking

## How to Access Web

### Direct Web Research
```bash
gemini "your question"
```

### Specific URL Content
- Use `Read` tool if you have file path
- Use `WebSearch` for web lookups
- Cite sources in responses

## Text & Data Tasks

### Process Text
- **grep** — Search patterns
- **sed/awk** — Text transformation
- **Read/Write/Edit** — File manipulation

### Code Analysis
- **grep -r** — Find patterns across files
- **find** — Locate files
- **Read** — Understand code

### Data Organization
- Structured output to files
- JSON for state
- Logs for audit trails

## Quick Decision Tree

**"I need to..."**
- Know a project rule? → CLAUDE.md / docs/
- Understand why something changed? → git log / git blame
- Remember a pattern from before? → memory files
- Check current web info? → `gemini "query"`
- Run something long? → `tmux new-session -d -s name "command"`
- Find code? → grep / Read
- Save results for later? → Write to file, share path

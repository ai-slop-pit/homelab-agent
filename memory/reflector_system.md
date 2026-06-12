---
name: reflector_system
description: Autonomous self-improvement system that analyzes codebase and generates improvement ideas
metadata:
  type: project
---

# Reflector: Autonomous Self-Improvement System

**Status**: Implemented and tested (2026-06-12)

## What it does

Runs independently (on schedule or daemon) to:
1. Analyze codebase structure, dependencies, and recent activity
2. Research best practices via web search (Claude with web access)
3. Generate 3-5 concrete improvement ideas per cycle
4. Classify ideas by significance: low/medium/high
5. Create improvement tasks in the database for the worker to process

## Three-Tier Significance System

| Tier | Action | Example |
|------|--------|---------|
| **LOW** | Auto-executes immediately | Fix typo, update comment, consolidate logs |
| **MEDIUM** | Creates task for user review | Add error handling, update deps, refactor |
| **HIGH** | Creates task with priority | New feature, API break, architecture change |

## Architecture

**Files**:
- `/opt/claude-agent/reflector/reflector.js` — Main reflector script
- `/opt/claude-agent/reflector/README.md` — Usage documentation

**Database schema updates**:
```sql
ALTER TABLE tasks ADD COLUMN significance TEXT DEFAULT 'medium'
ALTER TABLE tasks ADD COLUMN auto_execute INTEGER DEFAULT 0
ALTER TABLE tasks ADD COLUMN source TEXT  -- e.g., 'reflector:security'
```

**Integration points**:
- Worker polls `type='improvement'` tasks just like work tasks
- Follows plan → approve → implement workflow
- Creates topic in Telegram for each improvement (like work tasks)
- Reflects on completion to identify cascading improvements

## Usage

**One-time run**:
```bash
node /opt/claude-agent/reflector/reflector.js once
```

**Daemon mode** (every N ms):
```bash
node /opt/claude-agent/reflector/reflector.js daemon 3600000  # 1 hour
```

**Cron setup** (runs every 6 hours):
```bash
0 */6 * * * cd /opt/claude-agent && node reflector/reflector.js once >> logs/reflector.log 2>&1
```

## Generated Ideas by Category

Reflector researches and generates improvements in these domains:
- **security**: Validation, secrets, dependencies, error handling
- **performance**: Caching, indexes, query optimization, memory
- **reliability**: Error recovery, monitoring, logging
- **quality**: Code simplification, refactoring, tests
- **architecture**: Pattern improvements, skill extraction, automation

## How to Test

1. Run reflector once: `node reflector/reflector.js once`
2. Check logs: `tail /opt/claude-agent/logs/reflector.log`
3. View tasks in UI or database: `SELECT * FROM tasks WHERE type='improvement'`
4. Worker will automatically pick up and plan improvements
5. User approves/rejects in Telegram or UI

## Key Implementation Details

- Claude runs with `--web` flag for research capability
- JSON output extracted from markdown code blocks (Claude wraps in ```json```)
- chat_id set to 'reflector' for system-generated tasks
- auto_execute flag auto-approves low-significance improvements
- Migrations applied on startup to extend schema
- Follows same approval workflow as manual work tasks

# Reflector: Autonomous Self-Improvement

The reflector analyzes the agent's codebase, researches best practices via web search, and generates improvement ideas.

## Usage

### One-time reflection
```bash
node /opt/claude-agent/reflector/reflector.js once
```

### Daemon mode (continuous)
```bash
# Run reflector every 1 hour (3600000 ms)
node /opt/claude-agent/reflector/reflector.js daemon 3600000
```

## How it works

1. **Analysis**: Scans codebase structure, dependencies, and recent activity
2. **Research**: Uses Claude with web search to research best practices
3. **Generation**: Proposes 3-5 concrete improvements per cycle
4. **Classification**: Ranks each idea by significance:
   - **LOW**: Auto-executes immediately (cosmetic, typos, comments)
   - **MEDIUM**: Creates task for user review and approval
   - **HIGH**: Creates task with priority for review

5. **Task Creation**: Inserts tasks into the database for the worker to pick up

## Task Categories

- **security**: Vulnerability fixes, environment validation, secrets handling
- **performance**: Caching, indexing, query optimization
- **reliability**: Error handling, recovery, monitoring
- **quality**: Code simplification, refactoring, test coverage
- **architecture**: Pattern improvements, skill extraction, automation

## Integration with Worker

The worker polls for `type='improvement'` tasks and:
- Plans improvements (generates specific implementation steps)
- Awaits user approval (for medium/high significance)
- Implements approved improvements
- Reflects on completion to identify follow-up improvements

## Scheduling

To run reflector automatically on a schedule:

```bash
# Via cron (every 6 hours)
0 */6 * * * cd /opt/claude-agent && node reflector/reflector.js once >> logs/reflector.log 2>&1

# Or via supervisor/systemd (see service config)
```

## Logs

All reflector activity is logged to `/opt/claude-agent/logs/reflector.log`

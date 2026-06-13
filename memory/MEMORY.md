## Quick Navigation: When to Load What

Use this when you recognize a task type. Always check index first before reading files.

**Security-sensitive work**
→ **FIRST**: [feedback_never_expose_secrets.md](feedback_never_expose_secrets.md) — critical rules (THEN load task-specific files)

**Setup tasks** (new service, integration)
→ [setup_task_learning.md](setup_task_learning.md) — artifact capture system + patterns

**Git/code commits**
→ [feedback_git_workflow.md](feedback_git_workflow.md) — approval requirement

**Any Neovim config work** (plugins, settings, colorscheme)
→ [nvim_config_location.md](nvim_config_location.md) FIRST — config is NOT at default path

**General work** (remembering context, patterns)
→ [feedback_remember_important.md](feedback_remember_important.md) + [feedback_memory_discipline.md](feedback_memory_discipline.md)

---

## Index Rules & Maintenance

**Format**: `- [Name](file.md) — one-line description (~150 chars max)`

**Keep current**: Update index when memory files are added/changed/archived (same session)

**Check for drift**: If a file exists on disk but not in index → add it. If in index but disk → archive it.

**Task mappings**: In "Quick Navigation" section, list task keywords that trigger memory load

**Categories**: Keep semantic groups (Infrastructure, Feedback, Systems, etc.) organized and labeled

---

## Full Memory Index

**Configuration & Locations**:
- [Neovim config location](nvim_config_location.md) — Config is at `/opt/claude-agent/.config/nvim/` (XDG_CONFIG_HOME override), NOT `/root/.config/nvim/`

**User Preferences & Configuration**:
- [Theme preference](user_theme_preference.md) — Ultimate Dark Neo (Zed editor theme)
- [CT 112 Shell Enhancements](shell_enhancements_ct112.md) — bash-completion, fzf (Ctrl+R fuzzy history), cheat.sh (? <cmd> command help)

**Feedback & Rules**:
- [Remember important things](feedback_remember_important.md) — Save infrastructure, config, preferences, decisions, patterns. Ask if unsure.
- [CRITICAL: Secrets in .env only](feedback_never_expose_secrets.md) — Never expose tokens/keys in command line args, history, or logs
- [Git workflow rule](feedback_git_workflow.md) — Always ask user approval before committing to GitHub
- [Memory discipline rule](feedback_memory_discipline.md) — Read memory before ANY server work; update immediately after discovery
- [Show memory diffs](feedback_show_memory_diffs.md) — Always show a diff when writing/editing memory files
- [Skill loading strategy](feedback_skill_loading_strategy.md) — Recognize task type, load skill proactively; don't search memory for task execution

**Interview Prep**:
- [Interview prep setup](interview_prep_setup.md) — LeetCode slash commands, workflow, mentor CLAUDE.md for job search ~2026-07

**User Profile**:
- [User profile](user_profile.md) — Backend engineer at Wix, Lithuania, 12y exp, job searching ~2026-07

**Infrastructure & Services**:
- [Infrastructure services](infrastructure_services.md) — Container services, IPs, ports, data mounts (Plex, etc.)

**Systems & Processes**:
- [Setup Task Learning](setup_task_learning.md) — Extract bot IDs, API keys, config from setup tasks → persist in `.claude/setup-artifacts/` + index in `.claude/ARTIFACTS.md`
- [Reflector System](reflector_system.md) — Autonomous self-improvement: analyzes code, researches web, generates improvement ideas, creates tasks for worker
- [Async Logging Implementation](async_logging_implementation.md) — Non-blocking queue-based logger with batching replaces fs.appendFileSync()
- [Error Handling for Telegram](error_handling_telegram.md) — Wrapped bot.js and worker.js handlers in try-catch, added global unhandledRejection handlers

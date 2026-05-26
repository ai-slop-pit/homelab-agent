## Quick Navigation: When to Load What

Use this when you recognize a task type. Always check index first before reading files.

**Infrastructure work** (troubleshoot, status, access)
→ Use `/infrastructure` skill — containers, IPs, commands, mounts, hardware specs

**Storage/disk work**
→ Use `/infrastructure` skill + [incident_boot_failure_sda_removal.md](incident_boot_failure_sda_removal.md) — device renaming gotcha

**Security-sensitive work**
→ **FIRST**: [feedback_never_expose_secrets.md](feedback_never_expose_secrets.md) — critical rules (THEN load task-specific files)

**Setup tasks** (new service, integration)
→ [setup_task_learning.md](setup_task_learning.md) — artifact capture system + patterns

**Git/code commits**
→ [feedback_git_workflow.md](feedback_git_workflow.md) — approval requirement

**Skill/automation development**
→ [skill_architecture_best_practices.md](skill_architecture_best_practices.md) — agent-native pattern

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

**Operations & Incidents**:
- [Device renaming gotcha](incident_boot_failure_sda_removal.md) — When removing disks, Linux renumbers (sdb→sda). Must update fstab before reboot.

**Feedback & Rules**:
- [Remember important things](feedback_remember_important.md) — Save infrastructure, config, preferences, decisions, patterns. Ask if unsure.
- [CRITICAL: Secrets in .env only](feedback_never_expose_secrets.md) — Never expose tokens/keys in command line args, history, or logs
- [Git workflow rule](feedback_git_workflow.md) — Always ask user approval before committing to GitHub
- [Memory discipline rule](feedback_memory_discipline.md) — Read memory before ANY server work; update immediately after discovery

**Systems & Processes**:
- [Setup Task Learning](setup_task_learning.md) — Extract bot IDs, API keys, config from setup tasks → persist in `.claude/setup-artifacts/` + index in `.claude/ARTIFACTS.md`
- [Skill Architecture Best Practices](skill_architecture_best_practices.md) — Build agent-native skills (reasoning + guidelines), not executables

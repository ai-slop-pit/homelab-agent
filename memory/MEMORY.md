## Quick Navigation: When to Load What

Use this when you recognize a task type. Always check index first before reading files.

**Infrastructure work** (troubleshoot, status, access)
→ [server_infrastructure.md](server_infrastructure.md) — containers, IPs, commands, mounts

**Capacity/upgrade planning**
→ [hardware_specs.md](hardware_specs.md) — CPU, RAM, storage specs, expansion limits

**Storage/disk work**
→ [server_infrastructure.md](server_infrastructure.md) + [incident_boot_failure_sda_removal.md](incident_boot_failure_sda_removal.md) — device renaming gotcha

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

**Infrastructure & Operations**:
- [Complete server infrastructure (READ FIRST!)](server_infrastructure.md) — Containers, IPs, commands, mounts, workflows, disk health (updated 2026-05-26)
- [Hardware specs](hardware_specs.md) — CPU (i7-10700 8c/16t), RAM (16GB, 64GB max), storage (3.6TB HDD + 512GB NVMe), Proxmox 9.1.9
- [Quick reference (pointer)](core_infrastructure.md) — Fast lookup for container IPs + SSH. See server_infrastructure.md for full details.
- [Device renaming gotcha](incident_boot_failure_sda_removal.md) — When removing disks, Linux renumbers (sdb→sda). Must update fstab before reboot.

**Feedback & Rules**:
- [Remember important things](feedback_remember_important.md) — Save infrastructure, config, preferences, decisions, patterns. Ask if unsure.
- [CRITICAL: Secrets in .env only](feedback_never_expose_secrets.md) — Never expose tokens/keys in command line args, history, or logs
- [Git workflow rule](feedback_git_workflow.md) — Always ask user approval before committing to GitHub
- [Memory discipline rule](feedback_memory_discipline.md) — Read memory before ANY server work; update immediately after discovery

**Systems & Processes**:
- [Setup Task Learning](setup_task_learning.md) — Extract bot IDs, API keys, config from setup tasks → persist in `.claude/setup-artifacts/` + index in `.claude/ARTIFACTS.md`
- [Skill Architecture Best Practices](skill_architecture_best_practices.md) — Build agent-native skills (reasoning + guidelines), not executables

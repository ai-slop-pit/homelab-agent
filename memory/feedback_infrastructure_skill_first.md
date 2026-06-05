---
name: feedback_infrastructure_skill_first
description: Load infrastructure skill proactively for service/container questions
metadata:
  type: feedback
---

**Rule**: When user asks about service access, web UI links, container info, or infrastructure details → load `infrastructure` skill immediately and read LOOKUP.md or COMMANDS.md.

**Why**: Wasted time searching memory and guessing ports when the infrastructure skill has all service URLs and access commands in one place. Should trust the skill as the authoritative source.

**How to apply**:
- Service access question (e.g., "what is my torrents link") → Load infrastructure skill → Read LOOKUP.md for web UI links
- Container/container details (e.g., "where is qBittorrent?") → Load infrastructure skill → Read LOOKUP.md for IPs and purposes
- Service troubleshooting (restart, logs, status) → Load infrastructure skill → Read COMMANDS.md for execution
- Storage/disk questions → Load infrastructure skill → Read STORAGE.md

Never search memory for infrastructure info when the skill exists and has the answer.

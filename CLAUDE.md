# Claude Home Assistant — CT 112

## Identity
Autonomous home server assistant at 192.168.50.112.
Home lab: Proxmox 192.168.50.2 | n8n 192.168.50.153 | subnet 192.168.50.x

## Before Every Task
1. Read .learnings/MEMORY.md to load known patterns
2. Check if task matches a known skill in .learnings/skills/

## After Every Task
1. Did anything surprise you or fail first? Add to the relevant .learnings/<topic>.md file
2. Update .learnings/MEMORY.md index if you added a new entry
3. Log completion to logs/<date>.log

## Rules
- Destructive actions (rm -rf, git push to main, pct destroy, DROP TABLE): confirm with user first
- SSH to other hosts: use ssh -i /home/claude/.ssh/id_ed25519 root@<host>
- Never assume filesystem access to other containers — always SSH

## Tools
- Bash, Read, Write, Edit, Grep, Glob — full access
- gh — GitHub operations
- SSH key at /home/claude/.ssh/id_ed25519 (claude user) or /root/.ssh/id_proxmox (root)

---
name: memory-discipline
description: Always remember and save server/infrastructure details to avoid surprises in future conversations
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 99a35177-3c24-4e09-824f-d31aa0010bce
  lastUpdated: 2026-05-26
---

**Rule**: Before starting ANY work on the server or home lab, READ the memory files. Document ALL infrastructure details, container setups, storage configurations, and service mappings immediately after setup or discovery.

**Why**: User was frustrated when I didn't remember qBittorrent was in CT 110, Plex architecture, storage mount points, or disk health status. This caused repeated questions, wasted time, and confusion. The agent should KNOW the server setup cold.

**How to apply**: 
1. At start of conversation, check MEMORY.md (especially server_infrastructure.md)
2. If infrastructure changes (new container, disk replacement, service addition), UPDATE MEMORY immediately
3. Before troubleshooting or changes, reference MEMORY to understand current state
4. Never ask basic questions about the setup twice
5. When user says "remember X", add it to memory with full context
6. Create comprehensive infrastructure docs on first discovery (like server_infrastructure.md)

**Example from this session**:
- Should have known qBittorrent was in CT 110 from memory
- Should have known `/mnt/hdd-data` structure from memory
- Should have known old sda1 had bad blocks from memory
- Instead: asked "where is qBittorrent?" multiple times, wasted 30 min
- Result: user explicitly instructed "remember all things about server ALWAYS"

**Lesson**: The agent's value is in KNOWING the system deeply, not asking questions about its own infrastructure.

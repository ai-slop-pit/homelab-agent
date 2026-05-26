---
name: core-infrastructure
description: Quick reference for container IPs and SSH access (See server_infrastructure.md for full details)
metadata: 
  node_type: memory
  type: reference
  originSessionId: ba698004-e1e7-4332-8d6b-f69c656edc9f
  lastUpdated: 2026-05-26
---

**⚠️ This is a quick-reference pointer. For full details, see `server_infrastructure.md`**

## Container IPs (Quick Lookup)
- **110**: qBittorrent → `/data/downloads` (crucial ⭐)
- **101**: n8n automation → 192.168.50.153
- **102**: Jellyfin (media)
- **103**: Plex (media)
- **106**: Radarr | **107**: Sonarr | **108**: Seerr
- **112**: This agent (claude-code)

## SSH Access
```bash
pct exec 110 -- bash  # Enter qBittorrent (most common)
```

**Full reference**: See `server_infrastructure.md`

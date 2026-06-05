---
name: service-torrents-link
description: qBittorrent web UI access link and port configuration
metadata:
  type: reference
---

## qBittorrent Web UI

**Access Link**: `http://192.168.50.110:8080`

**Container**: CT 110 (Proxmox)  
**IP**: 192.168.50.110  
**WebUI Port**: 8080  
**Session Port**: 5925  

**Config Location**: `/root/.config/qBittorrent/qBittorrent.conf`

**How to find port**:
```bash
ssh -i /root/.ssh/id_proxmox root@192.168.50.2 "pct exec 110 -- cat /root/.config/qBittorrent/qBittorrent.conf | grep -i port"
```

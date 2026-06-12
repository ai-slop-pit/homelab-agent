---
name: infrastructure_services
description: Container services, IPs, ports, and data mounts on the Proxmox server
metadata:
  type: reference
---

## Plex Media Server

- **Container**: CT 103
- **IP**: 192.168.50.230
- **Port**: 32400
- **API URL**: http://192.168.50.230:32400 (returns XML)
- **Web UI URL**: http://192.168.50.230:32400/web
- **Data mount**: `/mnt/hdd-data/shared/media`

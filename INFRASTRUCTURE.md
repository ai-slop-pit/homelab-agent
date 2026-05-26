# Proxmox Infrastructure Reference

**Detailed infrastructure documentation is in your persistent memory.**

See **[server_infrastructure.md](memory/server_infrastructure.md)** for:
- Active containers (CT 110, 112, 101, 102-108)
- IP assignments and networking
- Storage layout and mount points
- SSH access and management commands
- Service dependencies and workflows
- Disk health and performance notes

**Quick Reference:**
- **Host**: 192.168.50.2 (Proxmox node)
- **This agent**: CT 112 (192.168.50.112)
- **Primary storage**: `/dev/sdb1` → `/mnt/hdd-data` (3.6TB)
- **Access**: `ssh -i /root/.ssh/id_proxmox root@192.168.50.2`

## Common Commands
```bash
# List containers
pct list

# Enter CT 110 (qBittorrent)
pct exec 110 -- bash

# Restart a service
pct exec 110 -- systemctl restart qbittorrent-nox

# Check mounts
cat /etc/pve/lxc/110.conf | grep mp
```

**Before any infrastructure task**: Load `memory/server_infrastructure.md` for full context.

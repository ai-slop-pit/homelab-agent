# Service Commands

**When to use this: Need to restart, check status, or view logs for a service.**

## Procedure: Execute Service Commands

**When**: User needs to manage services (qBittorrent, Plex, Radarr, Sonarr, etc.).

### Generic Access Commands

```bash
# Enter container shell
pct exec 110 -- bash

# Check container status
pct status 110

# List all containers
pct list

# SSH to Proxmox host
ssh -i /root/.ssh/id_proxmox root@192.168.50.2
```

### Service Management (Common Pattern)

Replace `<CT>` with container number, `<SERVICE>` with service name:

```bash
# Restart service
pct exec <CT> -- systemctl restart <SERVICE>

# Check status
pct exec <CT> -- systemctl status <SERVICE>

# View logs (last 50 lines)
pct exec <CT> -- journalctl -u <SERVICE> -n 50

# View logs (real-time follow)
pct exec <CT> -- journalctl -u <SERVICE> -f
```

### Service-Specific Commands

**qBittorrent** (CT 110):
```bash
pct exec 110 -- systemctl restart qbittorrent
pct exec 110 -- systemctl status qbittorrent
pct exec 110 -- ls /data/downloads
```

**Plex** (CT 103):
```bash
pct exec 103 -- systemctl restart plexmediaserver
pct exec 103 -- systemctl status plexmediaserver
```

**Radarr** (CT 106):
```bash
pct exec 106 -- systemctl restart radarr
pct exec 106 -- systemctl status radarr
```

**Sonarr** (CT 107):
```bash
pct exec 107 -- systemctl restart sonarr
pct exec 107 -- systemctl status sonarr
```

**Jellyfin** (CT 102):
```bash
pct exec 102 -- systemctl restart jellyfin
pct exec 102 -- systemctl status jellyfin
```

---

## Example: User reports "qBittorrent is hanging"

1. Check status: `pct exec 110 -- systemctl status qbittorrent`
2. View recent logs: `pct exec 110 -- journalctl -u qbittorrent -n 50`
3. Restart if needed: `pct exec 110 -- systemctl restart qbittorrent`
4. Verify: `pct exec 110 -- systemctl status qbittorrent`

---

## See Also

- [LOOKUP.md](LOOKUP.md) — Container IPs and purposes
- [STORAGE.md](STORAGE.md) — Disk health checks
- [SKILL.md](../SKILL.md) — Overview

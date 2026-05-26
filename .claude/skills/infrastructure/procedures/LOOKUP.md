# Infrastructure Lookup

**When to use this: Need container info, IPs, mounts, hardware specs, or service purposes.**

## Procedure: Retrieve Infrastructure Info

**When**: User needs container IP, mount points, service purpose, or hardware details.

### Container Lookup

| CT # | Name | IP | Purpose | Data Mount | Status |
|------|------|----|---------|----|--------|
| 110 | qBittorrent | 192.168.50.110 | Downloads | `/mnt/hdd-data/shared/downloads` → `/data/downloads` | ✅ Running |
| 103 | Plex | 192.168.50.103 | Media Server | `/mnt/hdd-data/shared/media` → `/mnt/media` | ✅ Running |
| 102 | Jellyfin | 192.168.50.102 | Media Server | `/mnt/hdd-data/shared/media` → `/mnt/media` | ✅ Running |
| 106 | Radarr | 192.168.50.106 | Movie Management | `/mnt/hdd-data/shared` → `/data` | ✅ Running |
| 107 | Sonarr | 192.168.50.107 | TV Management | `/mnt/hdd-data/shared` → `/data` | ✅ Running |
| 104 | Prowlarr | 192.168.50.104 | Indexer | N/A | ✅ Running |
| 105 | FlareSolverr | 192.168.50.105 | Captcha Solver | N/A | ✅ Running |
| 108 | Seerr | 192.168.50.108 | Requests | N/A | ✅ Running |
| 101 | n8n | 192.168.50.153 | Automation | N/A | ✅ Running |
| 115 | gemini-manager | — | — | N/A | ❌ Stopped |
| 116 | dashboard | — | — | N/A | ❌ Stopped |

### Hardware Specs

**Host**: HP EliteDesk 800 G6 Tower (Proxmox 9.1.9)  
**CPU**: Intel i7-10700 (8c/16t, 2.9-4.8 GHz)  
**RAM**: 16GB installed (max 64GB, 4 DIMM slots)  
**Storage**:
- NVMe: KIOXIA 512GB (Proxmox OS, `/dev/nvme0n1`)
- HDD: 3.6TB Seagate Enterprise (`/dev/sdb`, ext4, `/mnt/hdd-data`)

**Storage Directory** (`/mnt/hdd-data/`):
```
shared/
├── downloads/   → qBittorrent (CT 110)
├── media/       → Plex (CT 103) + Jellyfin (CT 102)
├── dump/
├── images/
├── private/
└── template/
```

### Network

**Proxmox Host**: 192.168.50.2 (SSH via `/root/.ssh/id_proxmox`)  
**Container Bridge**: vmbr0 (all containers behind bridge)  
**VPN**: NordLynx (WireGuard tunnel active)

---

## Example: User needs to SSH into qBittorrent

1. Look up CT 110 (qBittorrent) → IP `192.168.50.110`
2. SSH from agent: `ssh -i /home/claude/.ssh/id_ed25519 root@192.168.50.110`
3. Or exec from Proxmox: `pct exec 110 -- bash`

---

## See Also

- [COMMANDS.md](COMMANDS.md) — Execute service commands
- [STORAGE.md](STORAGE.md) — Disk health & capacity checks
- [SKILL.md](../SKILL.md) — Overview

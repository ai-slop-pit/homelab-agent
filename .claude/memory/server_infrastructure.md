---
name: server-infrastructure
description: "Complete Proxmox setup: containers, IPs, storage, mounts, services, commands, workflows"
metadata: 
  node_type: memory
  type: project
  originSessionId: 99a35177-3c24-4e09-824f-d31aa0010bce
  lastUpdated: 2026-05-26
  nextVerify: 2026-06-02
---

## Proxmox Host
- **IP**: 192.168.50.2
- **SSH Key**: `/root/.ssh/id_proxmox`
- **Commands**: Use `pct` for LXC container management

---

## Agent (You're Here)
- **Container**: CT 112 (claude-code)
- **IP**: 192.168.50.112
- **SSH Key**: `/home/claude/.ssh/id_ed25519`
- **Location**: `/opt/claude-agent`
- **Git**: https://github.com/ai-slop-pit/homelab-agent

---

## Storage & Disks

### Current Setup (May 25, 2026)
- **Active Disk**: `/dev/sdb` (4TB Seagate Enterprise ST4000NM0035)
  - **Partition**: sdb1 = 3.6TB ext4 (full disk, single partition)
  - **Mount**: `/mnt/hdd-data`
  - **Used**: 159GB | **Free**: 3.3TB | **Health**: ✅ EXCELLENT
  
- **Old Disk**: `/dev/sda` (1TB Seagate Mobile ST1000LM035) — RETIRED
  - **Status**: FAILING (504 reallocated sectors, 617 uncorrected errors, I/O errors on read)
  - **Mount**: Unmounted (physically remove when ready)
  - **Keep**: Not needed (all data migrated to sdb)

### Directory Structure
```
/mnt/hdd-data/
├── shared/
│   ├── downloads/     → qBittorrent (CT 110)
│   ├── media/         → Plex/Jellyfin (CT 103/102)
│   ├── dump/
│   ├── images/
│   ├── lost+found/
│   ├── private/
│   ├── template/
```

---

## Container Services

| CT # | Name | IP | Purpose | Data Mount | Status |
|------|------|----|---------|----|--------|
| 110 | qBittorrent | 192.168.50.110 | Downloads | `/mnt/hdd-data/shared/downloads` → `/data/downloads` | ✅ Running |
| 103 | Plex | 192.168.50.103 | Media Server | `/mnt/hdd-data/shared/media` → `/mnt/media` | ✅ Running |
| 102 | Jellyfin | 192.168.50.102 | Media Server | `/mnt/hdd-data/shared/media` → `/mnt/media` | ✅ Running |
| 106 | Radarr | 192.168.50.106 | Movie Management | `/mnt/hdd-data/shared` → `/data` | ✅ Running |
| 107 | Sonarr | 192.168.50.107 | TV Management | `/mnt/hdd-data/shared` → `/data` | ✅ Running |
| 104 | Prowlarr | 192.168.50.104 | Indexer | N/A | Running |
| 105 | FlareSolverr | 192.168.50.105 | Captcha Solver | N/A | Running |
| 108 | Seerr | 192.168.50.108 | Requests | N/A | Running |
| 101 | n8n | 192.168.50.153 | Automation | N/A | Running |
| 115 | gemini-manager | - | - | N/A | ❌ Stopped |
| 116 | dashboard | - | - | N/A | ❌ Stopped |

---

## Service Commands

**SSH Access**:
```bash
ssh -i /root/.ssh/id_proxmox root@192.168.50.2
```

**Container Access**:
```bash
pct exec 110 -- bash         # Enter container
pct list                     # List all containers
pct status 110               # Check container status
```

**qBittorrent Service** (CT 110):
```bash
pct exec 110 -- systemctl restart qbittorrent
pct exec 110 -- systemctl status qbittorrent
pct exec 110 -- ls /data/downloads
```

**Plex Service** (CT 103):
```bash
pct exec 103 -- systemctl restart plexmediaserver
pct exec 103 -- systemctl status plexmediaserver
```

**Radarr/Sonarr** (CT 106/107):
```bash
pct exec 106 -- systemctl restart radarr
pct exec 107 -- systemctl restart sonarr
```

---

## Workflow: Download → Organize → Play

1. **qBittorrent** (CT 110) downloads to `/data/downloads` (mounted from `/mnt/hdd-data/shared/downloads`)
2. **Radarr** (CT 106) + **Sonarr** (CT 107) monitor for completion
3. Files auto-move to `/data/media/movies` or `/data/media/series`
4. **Plex** (CT 103) scans `/mnt/media` and serves playback

---

## Storage Facts

- **Partition Table**: GPT (supports large disks)
- **Filesystem**: ext4
- **fstab Entry**: `/dev/sdb1 /mnt/hdd-data ext4 defaults 0 2`
- **Unpartitioned Space**: ~0 (sdb1 uses entire 3.6TB)
- **Future Partitions**: Can be created on-demand from existing space or new disk

---

## Data Status (May 25, 2026)

- **Total on disk**: 159GB (90 files)
- **Missing**: ~50GB (2 files unreadable from failing old sda1)
  - Interstellar.mkv (~33GB) — I/O error on old disk
  - 1 other large file
- **Recommendation**: Re-download missing files when needed

---

## Known Issues & Notes

1. **Old sda1 failing**: Reallocated sectors (504), uncorrected errors (617), read I/O errors
2. **Partition history**: sdb originally had 4 x 682.7GB partitions; merged to 1 x 3.6TB partition
3. **Failed torrent**: "Devious.Maids" (incomplete) — deleted during setup

---

## Next Steps / To-Do

- [ ] Physically remove old sda1 when physically convenient
- [ ] Re-download 2 missing files (Interstellar.mkv + 1 other) if needed
- [ ] Monitor qBittorrent for new downloads → auto-organize to media
- [ ] Plex library scans and builds

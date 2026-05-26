---
name: incident_boot_failure_sda_removal
description: Server failed to boot after removing old 1TB HDD - device renaming issue in fstab
metadata:
  type: project
  created: 2026-05-26
---

## Incident: Boot Failure (May 25, 2026)

**What happened:**
1. User physically removed old 1TB sda disk while HDD replacement was in progress
2. Server rebooted and failed to boot → stuck in emergency mode
3. Root cause: Linux renumbered drives, but /etc/fstab pointed to non-existent device

**The Problem Sequence:**
1. Old sda (1TB) was physically disconnected
2. Linux automatically renumbered: sdb (4TB new) → became sda
3. /etc/fstab still had UUID pointing to old sdb1:
   ```
   UUID=8bfe36d3-27dc-4cca-bd7d-421c50094aea /mnt/hdd-data ext4 defaults 0 2
   ```
4. At boot, systemd tried to mount /mnt/hdd-data
5. UUID not found (was on "missing" sdb) → 90-second timeout
6. Boot hung → Emergency mode (root@proxmox emergency shell)

**The Fix:**
1. Manually edited /etc/fstab (in emergency mode) or used sed
2. Changed sdb1 → sda1
3. Uncommented the mount line
4. Rebooted → Success

**Key Lessons:**
- **Device numbering is NOT stable** — when you remove a disk, remaining disks get renumbered
- **/etc/fstab must match actual device names** — can't rely on old device numbers after hardware changes
- **Required mounts cause boot failure** — if a marked-as-required mount fails, system halts in emergency mode
- **Comment out mounts before removing hardware** — safer than hoping the system reboots fine

**How to Avoid:**
- Before physically removing a disk:
  1. Unmount it (`umount /mnt/path`)
  2. Comment out or remove the fstab line
  3. Verify with `mount | grep device`
  4. THEN physically remove
- Or use `nofail` option in fstab so missing mounts don't halt boot

**UUID in fstab:**
```
UUID=8bfe36d3-27dc-4cca-bd7d-421c50094aea /mnt/hdd-data ext4 defaults 0 2
```
This UUID is now for `/dev/sda1` (was sdb1). If a future disk is added, verify UUID is still correct.

---

## Server Impact (May 25, 2026)
- **Offline time**: ~15 minutes (boot failure → emergency mode → manual fix → restart)
- **Containers affected**: CT 110 (qBittorrent), CT 103 (Plex), CT 106 (Radarr), CT 107 (Sonarr) stopped
- **Data**: Safe (mounted at /mnt/hdd-data, all 159GB accessible after fix)
- **Resolution**: Updated fstab, restarted containers, all services back online

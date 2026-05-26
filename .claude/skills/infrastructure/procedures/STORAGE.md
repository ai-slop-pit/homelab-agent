# Storage & Disk Health

**When to use this: Need to check disk space, health, mount points, or expansion options.**

## Procedure: Check Storage Status

**When**: User needs disk capacity, health checks, partition info, or expansion planning.

### Current Storage Configuration

**Boot/OS** (NVMe):
- Device: `/dev/nvme0n1` (KIOXIA 512GB)
- Mount: Proxmox OS and container storage
- Status: ✅ Primary boot drive

**Data Storage** (HDD):
- Device: `/dev/sdb` (Seagate Enterprise 4TB, 7200 RPM)
- Partition: `sdb1` (3.6TB ext4)
- Mount: `/mnt/hdd-data`
- Used: 159GB (4.4%)
- Free: **3.3TB**
- Health: ✅ EXCELLENT (no reallocated sectors)

**Retired** (removed):
- Device: `/dev/sda` (1TB, failing) — **PHYSICALLY REMOVED**

---

## Check Disk Space

```bash
# All mounted filesystems
df -h

# Specific data drive
df -h /mnt/hdd-data

# Directory size
du -sh /mnt/hdd-data/shared/*
```

### Current Usage

```
/mnt/hdd-data/
├── shared/downloads/   (contains torrent downloads)
├── shared/media/       (movies, series)
├── shared/dump/        (misc)
├── shared/images/      (images)
├── shared/private/     (private files)
└── shared/template/    (templates)

Total used: 159GB / 3.6TB (4.4%) — Plenty of headroom
```

---

## Check Disk Health (SMART)

```bash
# Install smartctl if needed
sudo apt-get install smartmontools

# Check sdb health
sudo smartctl -a /dev/sdb

# Quick health summary
sudo smartctl -H /dev/sdb
```

**What to look for**:
- ✅ "SMART overall-health assessment result: PASSED"
- ❌ High reallocated sectors (>100) = disk failing
- ❌ Uncorrected errors = I/O problems

---

## Expansion Options

**Available SATA Bays**: 3.5"/2.5" tool-less drive cages (2+ available)  
**Available M.2 Slot**: WiFi/Bluetooth card slot (upgrade later)  
**Available PCIe**: x16 slot available for GPU/HBA  

To add storage:
1. Get 4TB+ HDD (7200 RPM preferred, Seagate Enterprise)
2. Slot into tool-less bay
3. Format and mount to `/mnt/hdd-data-<N>`
4. Update fstab

---

## Known Issues

**Device Renaming**: When `/dev/sda` was removed, Linux auto-renumbered `/dev/sdb` → `/dev/sda`. Always verify with `lsblk` before partitioning. **UPDATE fstab BEFORE REBOOT** or system won't boot.

---

## Example: User asks "How much space is left?"

1. Run: `df -h /mnt/hdd-data`
2. Report: "3.3TB free (159GB used of 3.6TB)"
3. If near capacity, check: `du -sh /mnt/hdd-data/shared/*` to find large dirs

---

## See Also

- [LOOKUP.md](LOOKUP.md) — Mount points and directory structure
- [COMMANDS.md](COMMANDS.md) — Service management
- [SKILL.md](../SKILL.md) — Overview

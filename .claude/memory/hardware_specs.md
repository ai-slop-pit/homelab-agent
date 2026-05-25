---
name: hardware-specs
description: Complete Proxmox host hardware specifications and system info
metadata: 
  node_type: memory
  type: project
  lastUpdated: 2026-05-26
  originSessionId: dc102fb9-d0fd-47de-a93b-be3d31c35572
---

# Proxmox Host Hardware Specifications

## System
- **Model**: HP EliteDesk 800 G6 Tower PC (business-class, excellent thermals)
- **Motherboard**: HP 870C (LGA 1200, supports 10th-gen Intel)
- **Form Factor**: Tower (good airflow)

## CPU
- **Processor**: Intel Core i7-10700 (Comet Lake)
- **Cores**: 8 cores / 16 threads
- **Base Clock**: 2.9 GHz
- **Max Turbo**: 4.8 GHz
- **Socket**: LGA1200 (single socket)
- **Cache**: L1: 512 KiB | L2: 2 MiB | L3: 16 MiB
- **TDP**: ~65W (estimated)
- **Features**: VT-x virtualization, AVX2, SSE4.2, AES-NI

## Memory
- **Installed**: 1x 16GB Samsung DDR4-3200MHz (PC4-3200AA)
- **Current Available**: 15 GB (1GB reserved for system/firmware)
- **Currently Used**: 5.2 GB (34%)
- **Available for use**: 10 GB (free + cache)
- **Swap**: 8 GB (unused)
- **Expansion**: 4 DIMM slots (DIMM1-4) → max capacity 64GB
- **Type**: DDR4-3200 (NUMA node 0)

## Storage

### M.2 Slots
- **SSD1 (NVMe)**: KIOXIA 512GB PCIe M.2 SSD (Model: KBG40ZNV512G)
  - Device: `/dev/nvme0n1` (476.9 GB visible)
  - Purpose: Proxmox OS, containers, system boot
- **SSD2 (SATA M.2)**: ~~Samsung 128GB SATA M.2 SSD (MZ-NLN1280)~~ — **Removed (faulty)**
- **WiFi M.2 Slot**: Unpopulated (available for Wi-Fi/Bluetooth card)

### Primary Data Storage (External/Tower Bays)
- **Device**: `/dev/sda` (was `/dev/sdb` before old disk removal)
- **Capacity**: 3.6 TB
- **Type**: Seagate Enterprise ST4000NM0035 (4TB HDD, 7200 RPM)
- **Partition**: sda1 (ext4, entire disk)
- **Mount**: `/mnt/hdd-data`
- **Used**: 159 GB (4.4%)
- **Free**: 3.3 TB
- **Health**: ✅ Excellent (no reallocated sectors)
- **Location**: Tool-less drive cage (3.5"/2.5" SATA bays)

### Expansion Opportunities
- Additional 3.5"/2.5" SATA drive bays available (tool-less cages)
- SATA power + data cables pre-routed and ready

## Power Supply
- **Model**: HP 260W (Part No: L70041-001 / Model: PA-2251-SHK-HPF)
- **Efficiency**: 80 PLUS Platinum certified
- **Benefits**: Minimal power waste, low heat output → ideal for 24/7 home server operation
- **Current Load**: ~70-100W estimated (light load)

## PCIe Expansion Slots
- **Slot 1**: x16 (full-length) — available for GPU/HBA
- **Slot 2**: x4 (full-length) — available
- **Slot 3**: x1 (short) — available
- **Slot 4**: x1 (short) — available

## Network
- **Primary NIC**: Onboard Gigabit Ethernet (enp0s31f6)
- **MAC**: 50:81:40:2c:06:96
- **Speed**: Gigabit Ethernet (1 Gbps)
- **Bridge**: vmbr0 (virtual bridge for containers)
- **VPN**: nordlynx (WireGuard tunnel configured)
- **WiFi**: M.2 slot available for Wi-Fi/Bluetooth card (not installed)

## Virtualization
- **Hypervisor**: Proxmox VE 9.1.9
- **Kernel**: 7.0.0-3-pve (Debian 12 based)
- **Containers**: 9 active LXC containers + 1 QEMU VM
- **CPU Cores Allocated**: Shared across containers via vCPU assignments

## Cooling & Thermals
- **CPU Cooler**: HP OEM downdraft air cooler (LGA1200 mount)
- **Case Ventilation**: Single rear exhaust fan (black) positioned behind CPU socket
- **Airflow Design**: Downdraft cooler + rear exhaust (efficient, low-noise)
- **Performance**: Adequate for 24/7 operation; i7-10700 runs cool at base clocks
- **Form Factor**: Tower PC (good airflow compared to small form factor)

## Security Features
- **Mitigations**: Enhanced IBRS, IBPB, BHI, PBRSB-eIBRS, Spectre v2
- **Known Vulnerabilities**: Gather data sampling, MMIO stale data (mitigated)

---

## Expansion & Upgrade Path
- **RAM**: Currently 16GB (1 slot used) → can expand to 64GB max (DDR4-3200 preferred)
- **Storage**: 4 additional SATA 3.5"/2.5" bays available (tool-less mounting)
- **GPU/Accelerator**: PCIe x16 slot available (currently empty)
- **WiFi**: M.2 slot available for Wi-Fi/Bluetooth card

## Summary
This is a **high-quality business-class tower** with excellent thermals, 80 PLUS Platinum PSU, and plenty of expansion room. Current setup is efficient for 24/7 operation with good headroom for scaling.

## Notes
- Old failing sda (1TB) was physically removed; Linux auto-renumbered sdb → sda
- KIOXIA 512GB NVMe is primary boot/OS drive; 3.6TB Seagate HDD is data
- Faulty Samsung 128GB SATA M.2 removed from SSD2 slot
- All 9 containers share the Gigabit NIC via vmbr0 bridge
- NordLynx VPN tunnel active for external connectivity
- Proprietary HP motherboard = limited third-party BIOS mods, but stable for production

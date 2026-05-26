---
name: infrastructure
description: "When: Need container/hardware/storage info or service management. What: Unified Proxmox access. Why: Single source of truth."
disable-model-invocation: false
---

# Infrastructure

**Unified access to hardware specs, containers, storage, and service management.**

---

## Essentials

**Need container info?** Read [LOOKUP.md](procedures/LOOKUP.md)  
**Need to manage services?** Read [COMMANDS.md](procedures/COMMANDS.md)  
**Need storage/disk status?** Read [STORAGE.md](procedures/STORAGE.md)

---

## When to Use

- Troubleshooting infrastructure issues (container down, service hung, disk full)
- Accessing container IPs, mount points, SSH commands
- Checking hardware capacity (RAM, CPU, storage free space)
- Managing services (restart, status, logs)
- Verifying disk health and expansion options

---

## Key Principle

Infrastructure knowledge is the source of truth. This skill consolidates hardware specs and service info into one declarative interface, eliminating the need to load separate memory files for every infrastructure task.

---

## Procedure Map

| Task | Read This |
|------|-----------|
| Look up container info, IPs, mounts | [LOOKUP.md](procedures/LOOKUP.md) |
| Execute service commands (restart, logs, status) | [COMMANDS.md](procedures/COMMANDS.md) |
| Check disk health, free space, partitions | [STORAGE.md](procedures/STORAGE.md) |

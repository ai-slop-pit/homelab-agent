# Memory Archive

Reference for resolved issues and learned lessons.

**Incidents & Lessons**:
- [Device renaming gotcha](incident_boot_failure_sda_removal.md) — May 25, 2026: Server failed to boot after disk removal. Linux renumbered devices but fstab referenced old device names. Fixed by updating fstab before reboot.

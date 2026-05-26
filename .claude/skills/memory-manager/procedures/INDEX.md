# Index Management

**Keep MEMORY.md current and in sync with actual memory files.**

## Procedure: Maintain the Index

**When**: Beginning and end of session (or when structure changes)

**Steps**:
1. **Verify entries exist**: Check MEMORY.md points to files that exist
2. **Add missing**: Any new files discovered? Add to index
3. **Remove deleted**: Any files archived? Remove from index
4. **Update descriptions**: If file content changed significantly, update its description
5. **Check structure**: Does MEMORY.md organization reflect reality?
6. **Verify links**: Spot-check that entries are accurate

## MEMORY.md Rules

- Concise entries: ~150 characters max per line
- Format: `- [Title](file.md) — short description`
- Organized by category/task type
- Always accurate (gospel)

## Example

Entry format:
```markdown
- [Device renaming gotcha](incident_boot_failure_sda_removal.md) — When removing disks, Linux renumbers (sdb→sda). Must update fstab before reboot.
```

Index = Source of truth. Keep it accurate.

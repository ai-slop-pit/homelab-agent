# Consolidation

**When you find duplicate or overlapping memory.**

## Procedure: Merge Duplicates

**When**: Detect any overlap or duplication in memory

**Steps**:
1. Identify overlapping facts/files
2. **Pick survivor**: Which file is better-organized?
3. **Merge content**: Copy unique facts from loser into survivor
4. Update survivor's lastUpdated = today
5. **Archive loser**: Move to `.claude/memory/archive/[YYYY-MM-DD]/[filename].md`
6. **Update MEMORY.md**: Remove loser entry, confirm survivor is indexed
7. Report: "Merged [file1] + [file2] → [survivor]"

## Be Aggressive

If you see overlap, merge it. Don't wait for complexity analysis.

**Rule**: One source of truth per fact.

## Example

You notice:
- `infrastructure.md` has "CT 110 uses /data/downloads"
- `containers.md` has "CT 110 mount: /data/downloads"

**Action**:
1. Pick survivor: `infrastructure.md` (broader scope)
2. Copy unique content from `containers.md` into `infrastructure.md`
3. Archive `containers.md`
4. Update MEMORY.md index
5. Done

Duplicates confuse lookups. Consolidate immediately.

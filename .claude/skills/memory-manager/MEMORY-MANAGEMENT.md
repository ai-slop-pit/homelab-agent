# Memory Management — Detailed Procedures

**Reference file for memory-manager skill. Read on demand when you need full procedures.**

---

## Proactive Procedures (Do Without Asking)

### Procedure 0: Auto-Save Discovery (Always, During Work)

**When**: Agent learns ANYTHING new—immediately, mid-task

**Steps**:
1. Identify what was learned (fact, pattern, preference, rule, incident)
2. Find memory file: use MEMORY.md index OR create new file if missing
3. **Update immediately**: Don't wait until task end
4. If file exists: Edit to add/update (keep structure)
5. If file missing: Write new file with frontmatter
6. **Update lastUpdated = today** (always)
7. Update MEMORY.md if file is new or structure changed
8. No announcement needed (silent operation)

**Why**: Memory evolves during work. Don't defer updates.

---

### Procedure 1: Proactive Freshness Check (Weekly or At Start)

**When**: Beginning of session OR after every major task batch

**Steps**:
1. Load MEMORY.md and all file frontmatter
2. For each file, calculate: age_days = today - lastUpdated
3. **Flag stale**: infrastructure/config >30 days, patterns >60 days, learnings >90 days
4. **Verify critical facts**: For stale infra files, check if still accurate
5. **Auto-rectify**: Update lastUpdated if verified still accurate
6. **Report to user**: "Memory freshness: X current, Y stale"

---

### Procedure 2: Rectify Inconsistencies (Continuous)

**When**: Detected during any memory access

**Rectify immediately:**
- Broken links → Remove from index
- Missing timestamps → Add today's date
- Duplicate facts → Merge, archive one
- Outdated references → Update both fact and index
- Orphaned files → Index or archive
- Invalid frontmatter → Add proper frontmatter

---

### Procedure 3: Keep MEMORY.md Always Fresh (Every Session)

**When**: Beginning and end of session

**Steps**:
1. Verify index entries match actual files
2. Check descriptions are accurate
3. Add any new files discovered
4. Remove archived entries
5. Spot-check links work
6. Update if structure changed

---

### Procedure 4: Consolidate Duplicates (Aggressively)

**When**: Detect any overlap or duplication

**Steps**:
1. Identify overlapping facts/files
2. **Merge into one**: Pick survivor, merge content
3. Update survivor's lastUpdated
4. Archive loser: move to `.claude/memory/archive/[YYYY-MM-DD]/`
5. Update MEMORY.md
6. Report: "Merged [file1] + [file2] → [survivor]"

**Be aggressive**: If you see overlap, merge it.

---

### Procedure 5: Archive Outdated Facts (Auto-Decide)

**When**: Fact is no longer relevant

**Steps**:
1. Move file to `.claude/memory/archive/[YYYY-MM-DD]/[filename].md`
2. Add archival comment: "Archived [date] because: [reason]"
3. Remove from MEMORY.md index
4. Report: "Archived [file]"

---

## Memory Freshness TTLs

- **Infrastructure** (IPs, services, mounts): 30 days
- **Patterns & lessons**: 60 days
- **Preferences & rules**: 90 days
- **Historical incidents**: 180 days (then archive)
- **Setup artifacts**: 30 days

---

## Key Principle

**Memory evolves, not preserved.** Update first, ask questions later. Embrace continuous improvement.

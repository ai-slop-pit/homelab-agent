---
name: memory-manager
description: Proactively maintain and evolve persistent memory. Auto-save discoveries, detect staleness, rectify inconsistencies, keep memory fresh and accurate.
disable-model-invocation: false
---

Memory Manager Skill

**Agent continuously evolves memory through work, without waiting to be asked.**

## Identity

Memory-manager is a **behavioral capability**, not a tool. The agent embodies this by:
- **Auto-saving** discoveries during every task (don't wait for user)
- **Proactively** checking memory freshness and rectifying stale content
- **Detecting** duplicates and inconsistencies, then fixing them
- **Keeping** MEMORY.md index always current and accurate
- **Building** semantic understanding of which memory solves which problems
- **Proposing** consolidations, archival, and improvements automatically

The skill is **agent-native**: no scripts, no CLI tools. Just reasoning + guidelines.

## What Agent Does (Always Active)

✅ **Auto-save** every discovery, pattern, decision, configuration learned
✅ **Update** memory during task execution (proactively, don't wait)
✅ **Modify** facts freely—update immediately when you learn something new
✅ **Consolidate** duplicates and overlaps (merge, archive automatically)
✅ **Archive** outdated facts immediately (move to history, keep git record)
✅ **Rectify** inconsistencies on-the-fly (fix timestamps, links, structure)
✅ **Reorganize** MEMORY.md when patterns suggest better structure
✅ **Detect** gaps and create new memory files as needed
✅ **Propose** improvements continuously (don't wait for formal audits)

⚠️ **Careful**: If unsure about a fact, add it—better to have and verify later than lose it
⚠️ **Preserve**: Always archive instead of delete (keep git history)
⚠️ **Timestamp**: Update lastUpdated whenever you touch a file
⚠️ **Secrets**: Never expose tokens, keys, env vars in any form

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

### Procedure 1: Proactive Freshness Check (Weekly or At Start)

**When**: Beginning of session OR after every major task batch

**Steps**:
1. Load MEMORY.md and all file frontmatter
2. For each file, calculate: age_days = today - lastUpdated
3. **Flag stale**: infrastructure/config >30 days, patterns >60 days, learnings >90 days
4. **Verify critical facts**: For stale infra files, check if still accurate (e.g., IPs, service status)
5. **Auto-rectify**: Update lastUpdated if verified still accurate
6. **Report to user**: "Memory freshness: X current, Y stale (flagged for review)"

**Why**: Stale memory is dangerous; proactive checks prevent rot.

### Procedure 2: Rectify Inconsistencies (Continuous)

**When**: Detected during any memory access

**Rectify immediately:**
- **Broken links**: MEMORY.md points to non-existent file → Remove from index
- **Missing timestamps**: File has no lastUpdated → Add today's date
- **Duplicate facts**: Same info in two files → Merge, archive one, update MEMORY.md
- **Outdated references**: Fact says "old location" but you know new location → Update both fact and MEMORY.md
- **Orphaned files**: File exists but not in MEMORY.md → Index it or archive it
- **Invalid frontmatter**: File missing name/description → Add proper frontmatter

**After rectifying:**
1. Update file's lastUpdated
2. Update MEMORY.md if structure changed
3. Report briefly: "Fixed: [issue count] inconsistencies"

### Procedure 3: Keep MEMORY.md Always Fresh (Every Session)

**When**: Beginning and end of session

**Steps**:
1. Verify index entries match actual files in memory/
2. Check that descriptions are accurate (skim file content if >30 days old)
3. Add any new files discovered during task work
4. Remove archived entries
5. Verify links work (spot-check a few)
6. Update line-count if significantly changed

**Why**: Stale index defeats purpose of having one.

### Procedure 4: Consolidate Duplicates (Aggressively)

**When**: Detect any overlap or duplication

**Steps**:
1. Identify overlapping facts/files
2. **Merge into one**: Pick best-organized survivor, merge content from loser
3. Update survivor's lastUpdated
4. Archive loser file: move to `.claude/memory/archive/[YYYY-MM-DD]/[filename].md`
5. Update MEMORY.md: remove loser, confirm survivor in index
6. Report: "Merged [file1] + [file2] → [survivor]"

**Why**: Duplicates confuse lookups. One source of truth per fact.

**Be aggressive**: If you see overlap, merge it. Don't wait.

### Procedure 5: Archive Outdated Facts (Auto-Decide)

**When**: Fact is no longer relevant OR contradicted by newer info

**Steps**:
1. Move file to `.claude/memory/archive/[YYYY-MM-DD]/[filename].md`
2. Add archival comment: "Archived [date] because: [reason]"
3. Remove from MEMORY.md index
4. Report: "Archived [file] ([reason])"

**Examples**:
- "This incident was resolved 90 days ago"
- "Superseded by [newer-file]"
- "Service no longer runs on this host"

### Procedure 6: Propose Improvement (Smart Suggestion)

**When**: Pattern detected or gap noticed

**Examples**:
- "I used [file] 5 times this week; consider splitting into sub-files for clarity"
- "Missing memory on [topic]; should I create [filename].md?"
- "MEMORY.md section [X] hasn't been accessed in 3 months; archive it?"
- "I keep looking for [fact]; should we add [new section]?"

**How to propose**:
- Make the suggestion natural (in prose, not as command)
- Offer to take action if user agrees
- Don't wait; suggest immediately if pattern is clear

## Memory Freshness TTLs (Guidelines)

Use these to flag staleness:
- **Infrastructure** (IPs, services, mounts): 30 days
- **Patterns & lessons**: 60 days
- **Preferences & rules**: 90 days
- **Historical incidents**: 180 days (then archive)
- **Setup artifacts**: 30 days (verify still accurate)

## Output Format

Agent reports memory operations as natural, brief statements:
- "✓ Saved discovery to [file]"
- "Rectified: [count] inconsistencies"
- "Memory freshness: [X] current, [Y] stale"
- "Proposal: [suggestion]"

## Guidelines (Not Restrictions)

1. **Update freely**: If you learn something new, update memory immediately
2. **Archive, don't delete**: Move outdated facts to history/ (preserve git record)
3. **Timestamp every write**: lastUpdated = today when you modify anything
4. **Protect secrets always**: Never expose tokens, keys, env vars
5. **MEMORY.md is gospel**: Index reflects current structure; keep it in sync
6. **Consolidate aggressively**: Merge overlaps and duplicates without asking
7. **Rectify on-the-fly**: Fix broken links, inconsistencies, stale timestamps immediately
8. **Embrace evolution**: Memory improves continuously, not through approval gates

## Related Concepts

- Memory evolves during work, not in separate phases
- Freshness validation prevents stale facts
- Auto-rectification keeps index and files consistent
- Consolidation reduces cognitive load
- Archival preserves history without cluttering present

## Notes

- This skill is **discovered through work**. As the agent executes tasks, it learns that memory management is a continuous need, not a batch process.
- **Active evolution**: Memory improves with every task. Agent learns what facts are useful, what's outdated, what's missing.
- **Feedback loop**: Better memory → Better task execution → More accurate learnings → Continuously improving memory.

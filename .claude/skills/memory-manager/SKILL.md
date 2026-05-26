---
name: memory-manager
description: Analyze and maintain persistent memory files. Detect duplicates, staleness, gaps. Propose consolidations, track memory effectiveness, evolve organization.
disable-model-invocation: false
---

Memory Manager Skill

**Agent autonomously maintains persistent memory through reasoning, analysis, and guided updates.**

## Identity

Memory-manager is a **behavioral capability**, not a tool. The agent embodies this skill by:
- Analyzing memory files for quality issues (duplicates, staleness, gaps)
- Proposing improvements to the user
- Integrating feedback into memory structure
- Tracking which memory helps solve which problems
- Evolving memory organization over time

The skill is **agent-native**: no scripts, no CLI tools. Just reasoning + guidelines + heuristics.

## What Agent Does (Scope)

✅ **Analyze** memory files for duplicates, staleness, unused content
✅ **Propose** consolidations (only if one is superset of other)
✅ **Validate** freshness using TTL rules from heuristics.json
✅ **Track** which files solved which problems (feedback loops)
✅ **Update** memory when user provides corrections or new info
✅ **Archive** resolved incidents to history/ with timestamps
✅ **Build** semantic map (task → memory files)
✅ **Suggest** improvements when patterns detected

❌ **Delete** memory without explicit user approval
❌ **Modify** memory facts without user confirmation
❌ **Expose** secrets or sensitive info in reports
❌ **Consolidate** unless one file is clear superset

## Agent Procedures

### Procedure 0: Read Index First

**Every memory operation starts here**:

**Steps**:
1. Read `.claude/memory/MEMORY.md` (the index)
2. Use index to locate relevant files by task/category
3. Read only the files you need (not all files)
4. Use MEMORY.md as source-of-truth for what exists

**Why**: Index prevents unnecessary reads and reveals file organization immediately.

### Procedure 1: Memory Audit (Full Analysis)

**When**: User requests "Audit the memory" or agent initiates monthly check

**Steps**:
1. **Read index**: Load MEMORY.md to understand structure
2. **Read metadata**: Load all memory file frontmatter (name, description, type, lastUpdated)
3. **Detect duplicates**: Compare file descriptions using heuristics.json thresholds
4. **Validate freshness**: Check lastUpdated timestamps against heuristics.json TTLs
5. **Analyze index**: Check if MEMORY.md mappings are accurate and complete
6. **Report findings**: Analyze for duplicates, staleness, gaps, index drift
7. **Propose actions**: Consolidate, archive, refresh, or update MEMORY.md

### Procedure 2: Freshness Validation

**When**: Monthly check or user asks "Verify memory freshness"

**Steps**:
1. Load heuristics.json (TTL rules by fact type)
2. For each memory file, extract lastUpdated
3. Calculate age_days = today - lastUpdated
4. Flag files exceeding TTL
5. For critical facts: verify still accurate
6. Report: "All current ✅" or "X files need refresh, Y are stale"

### Procedure 3: Keep MEMORY.md Current

**When**: After discovering/creating/archiving memory files

**Steps**:
1. Update MEMORY.md task mappings if they change
2. Update file descriptions if content significantly changes
3. Add new task categories if you discover new patterns
4. Verify index reflects current memory structure
5. Keep mapping entries under ~150 characters (concise index)

**Why**: Stale MEMORY.md defeats the purpose of having an index.

### Procedure 4: Log Memory Usage (Feedback Loop)

**When**: After agent uses memory to solve a problem

**Steps**:
1. Note: which memory files were helpful? Which were missing?
2. Track: Did index map correctly to task? Or did I miss files?
3. Feedback: Propose MEMORY.md improvements if mappings are wrong
4. Result: Over time, index becomes better at guiding agent

### Procedure 5: Update Memory on User Feedback

**When**: User corrects or adds info ("Remember that X moved to Y")

**Steps**:
1. Extract fact from user input
2. Find relevant memory file (use MEMORY.md to locate)
3. Locate section that needs update
4. Use Edit tool to update content
5. Update lastUpdated timestamp to today
6. Update MEMORY.md if file description or mapping changed
7. Confirm: "✓ Updated [file] with [change]"

### Procedure 6: Archive Resolved Incident

**When**: Incident is resolved and no longer relevant (e.g., old boot failure)

**Steps**:
1. Move file to `.claude/memory/archive/[YYYY-MM-DD]/[filename].md`
2. Remove entry from MEMORY.md index (under appropriate section)
3. Document reason: why is this being archived?
4. Update lastUpdated in archive note with date

## Output Format

Agent reports findings as natural language analysis with recommendations.

## Architecture: Agent-Native (No Scripts)

The skill is pure **reasoning + guidelines**. Agent executes using Read, Edit, Write tools and Claude reasoning.

## Constraints

1. **Index first**: Always start with MEMORY.md; never read all files indiscriminately
2. **Safe by default**: All proposals are *suggestions*, not actions
3. **No auto-delete**: User must approve archival/deletion
4. **Preserve git history**: When archiving, move to history/; don't delete
5. **Protect secrets**: Never expose token values, env vars, or credentials in reports
6. **Index integrity**: If MEMORY.md is out of sync with actual files, flag and fix it
7. **Respect user intent**: If user explicitly saved something, don't delete it without asking


## Related Concepts

- Memory freshness validation happens during regular audits
- Semantic mapping connects task patterns to relevant memory files
- Archive decisions follow the "still relevant?" question based on task patterns

## Notes

- This skill is **discovered through work**, not pre-planned. As the agent executes tasks, it learns that memory management is a generic problem that deserves a dedicated skill.
- **Evolution opportunity**: As the skill matures, propose building a knowledge-graph version (SHIMI-style hierarchical semantic memory) for advanced multi-hop queries.
- **Feedback loop**: Agent uses memory-manager to improve memory → improved memory → better task execution → more learnings → memory evolves continuously.

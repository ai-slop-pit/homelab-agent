# Memory Manager Skill

**Behavioral capability**: Agent autonomously maintains memory health through reasoning, analysis, and guided updates.

## What This Skill Does

Agent analyzes memory files for:
- **Duplicates** — Files >60% similar (consolidate or archive?)
- **Staleness** — Facts older than TTL (7d critical, 30d normal, 60d historical)
- **Gaps** — Missing or contradictory information
- **Usage patterns** — Which files solve which problems?

## How Agent Uses This Skill

**User**: "Audit the memory"

**Agent**:
1. Reads SKILL.md (procedures)
2. Reads heuristics.json (decision rules)
3. Uses Read tool (load memory files)
4. Applies reasoning (analyze using heuristics)
5. Proposes improvements (natural language)
6. Uses Edit/Write tools (implement with approval)

---

**For detailed procedures and constraints: see SKILL.md**

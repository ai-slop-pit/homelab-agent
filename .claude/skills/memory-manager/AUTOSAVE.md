# Auto-Save

**Save new discoveries immediately during work.**

## Procedure: Save Discovery

**When**: You learn something new—immediately, mid-task

**Steps**:
1. Identify what was learned (fact, pattern, preference, rule, incident)
2. **Find location**: Use MEMORY.md to locate relevant file
3. **If file exists**: Edit to add/update (preserve structure)
4. **If file missing**: Create new file with frontmatter
5. **Update lastUpdated = today** (always)
6. **Update MEMORY.md** if file is new or structure changed
7. Done—no announcement needed

## Frontmatter Template (For New Files)

```markdown
---
name: {{short-kebab-case-slug}}
description: {{one-line summary}}
metadata:
  type: {{user, feedback, project, reference}}
  created: {{YYYY-MM-DD}}
  lastUpdated: {{YYYY-MM-DD}}
---

Content starts here.
```

## Example

**During work, you learn**: "CT 110 storage expanded from 100GB to 500GB"

**Action**:
1. Find: MEMORY.md → Infrastructure section
2. Open: server_infrastructure.md
3. Update: Change 100GB → 500GB
4. Timestamp: Update lastUpdated = today
5. Done

## Key Rule

**Update immediately.** Don't defer. Memory grows during work, not after.

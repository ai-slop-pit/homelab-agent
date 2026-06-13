---
name: feedback_lib_first_check
description: Check lib/ directory for shared infrastructure before writing new utility code
metadata:
  type: feedback
  created: 2026-06-14
---

## Rule: Check lib/ First

**When**: About to write utility code, infrastructure setup, or repeated logic across modules.

**Why**: 
- Tasks #17-19 found that multiple modules were reimplementing DB connection logic, migrations, and logging
- Duplication causes divergent behavior and maintenance burden
- lib/ is the single source of truth for infrastructure

**How to apply**:
1. Before writing getDatabase() or new Database() → check lib/db.js
2. Before writing logging code → check lib/logger.js
3. Before adding migration logic → check lib/schema.js
4. Before writing rate limiting → check lib/rateLimit.js
5. Before writing validation → check lib/validate.js

**If the module exists**: Import and use it (avoid duplication)
**If the module doesn't exist**: Consider whether it belongs in lib/ or is module-specific

**Heuristic**: If 2+ modules need the same code, extract to lib/. If only 1 module needs it, keep it local.
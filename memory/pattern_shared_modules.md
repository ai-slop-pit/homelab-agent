---
name: pattern_shared_modules
description: Shared infrastructure modules (DB, logging, rate limiting) in lib/ directory
metadata:
  type: reference
  created: 2026-06-14
---

## Pattern: Service Modules in lib/

**When to use**: Multiple modules need same functionality (database connections, logging, API rate limiting, validation).

**Why it matters**: 
- Eliminates duplication of connection setup, error handling, config reading
- Single point of maintenance (fix once, works everywhere)
- Enforces consistency (all modules use same logger, same DB instance)
- Tested once, used everywhere

**How to apply**:
1. Identify reusable functionality: DB connection, logger, rate limiter, validators
2. Extract to lib/<feature>.js with clean exports
3. Use singleton pattern for stateful resources (Database, Logger)
4. Export helper functions for common operations (getMetric, setMetric, sendMsg)
5. All modules import from lib/ instead of reimplementing

**Current lib/ modules**:
- db.js — Database singleton with migration runner
- logger.js — Async non-blocking logger with buffering
- schema.js — Centralized migrations (DRY principle)
- rateLimit.js — API rate limiter for Telegram
- validate.js — Data validation utilities

**Pattern from tasks #17-19**: Extracting db.js, schema.js, logger.js eliminated duplicate connections, repeated ALTER TABLE statements, and blocking I/O across worker.js, bot.js, reflector.js.

**Feedback**: Before writing utility code in a module, check if it already exists in lib/. This prevents divergent implementations.
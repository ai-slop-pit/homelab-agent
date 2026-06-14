---
name: database_constraints_migration
description: Migration that adds NOT NULL and CHECK constraints to tasks table with data normalization
metadata:
  type: project
---

## Problem
Tasks table had invalid states: NULL status/type fields, invalid status values ("planning", "failed"). No CHECK constraints to prevent future invalid data.

## Solution Implemented
Added migration in lib/schema.js `ADD_CONSTRAINTS_MIGRATION` that:

1. **Normalizes existing invalid data**:
   - "planning" → "planned"
   - "failed" → "rejected"
   - NULL status → "inbox"
   - NULL type → "chat"
   - NULL description/chat_id → ""
   - NULL created_at → CURRENT_TIMESTAMP

2. **Enforces constraints** via table recreation:
   - NOT NULL on: chat_id, description, status, type, created_at
   - CHECK on status: enum values only ('inbox','backlog','planned','in_progress','awaiting_approval','approved','rejected','done')
   - All columns keep DEFAULT values

3. **Data preservation**: Uses INSERT...SELECT to copy all data from old table to new schema

## Files Modified
- `lib/schema.js`: Added ADD_CONSTRAINTS_MIGRATION export
- `lib/db.js`: 
  - Updated runMigrations() to handle both string and object migration formats
  - Added applyConstraintMigration() that checks for NOT NULL on status before applying
  - Exports ADD_CONSTRAINTS_MIGRATION for use in runMigrations()

## Testing
- Verified migration successfully backfills NULL values
- Verified CHECK constraint rejects invalid status values
- Verified NOT NULL constraints prevent NULL inserts
- Verified data is preserved during table recreation
- Verified all 4 indexes are recreated
- Schema validated: all constraints and defaults active

## Migration Idempotency
Migration detects if already applied by checking if status column has NOT NULL constraint via PRAGMA table_info().

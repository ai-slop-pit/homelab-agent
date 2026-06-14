const MIGRATIONS = [
  { name: "add_session_id", sql: "ALTER TABLE tasks ADD COLUMN session_id TEXT" },
  { name: "add_tg_message_id", sql: "ALTER TABLE tasks ADD COLUMN tg_message_id TEXT" },
  { name: "add_thinking_msg_id", sql: "ALTER TABLE tasks ADD COLUMN thinking_msg_id TEXT" },
  { name: "add_type", sql: "ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT 'chat'" },
  { name: "add_title", sql: "ALTER TABLE tasks ADD COLUMN title TEXT" },
  { name: "add_plan", sql: "ALTER TABLE tasks ADD COLUMN plan TEXT" },
  { name: "add_progress", sql: "ALTER TABLE tasks ADD COLUMN progress TEXT" },
  { name: "add_created_by", sql: "ALTER TABLE tasks ADD COLUMN created_by TEXT DEFAULT 'user'" },
  { name: "add_priority", sql: "ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 0" },
  { name: "add_rejection_notes", sql: "ALTER TABLE tasks ADD COLUMN rejection_notes TEXT" },
  { name: "add_tg_topic_id", sql: "ALTER TABLE tasks ADD COLUMN tg_topic_id INTEGER" },
  { name: "add_significance", sql: "ALTER TABLE tasks ADD COLUMN significance TEXT DEFAULT 'medium'" },
  { name: "add_auto_execute", sql: "ALTER TABLE tasks ADD COLUMN auto_execute INTEGER DEFAULT 0" },
  { name: "add_source", sql: "ALTER TABLE tasks ADD COLUMN source TEXT" },
  { name: "create_metrics_table", sql: "CREATE TABLE IF NOT EXISTS metrics (key TEXT PRIMARY KEY, value INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)" },
  { name: "index_tasks_status", sql: "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)" },
  { name: "index_tasks_type", sql: "CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type)" },
  { name: "index_tasks_chat", sql: "CREATE INDEX IF NOT EXISTS idx_tasks_chat ON tasks(chat_id)" },
  { name: "index_tasks_created", sql: "CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC)" },
]

// Migration to add NOT NULL constraints and CHECK constraints for valid states
const ADD_CONSTRAINTS_MIGRATION = `
  BEGIN TRANSACTION;

  -- Normalize invalid status values to valid ones
  UPDATE tasks SET status = 'planned' WHERE status = 'planning';
  UPDATE tasks SET status = 'rejected' WHERE status = 'failed';

  -- Backfill NULLs with defaults
  UPDATE tasks SET status = COALESCE(status, 'inbox') WHERE status IS NULL;
  UPDATE tasks SET type = COALESCE(type, 'chat') WHERE type IS NULL;
  UPDATE tasks SET description = COALESCE(description, '') WHERE description IS NULL;
  UPDATE tasks SET chat_id = COALESCE(chat_id, '') WHERE chat_id IS NULL;
  UPDATE tasks SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL;

  -- Recreate table with constraints enforced
  CREATE TABLE IF NOT EXISTS tasks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'inbox' CHECK(status IN ('inbox','backlog','planned','in_progress','awaiting_approval','approved','rejected','done')),
    result TEXT,
    session_id TEXT,
    tg_message_id TEXT,
    thinking_msg_id TEXT,
    type TEXT NOT NULL DEFAULT 'chat',
    title TEXT,
    plan TEXT,
    progress TEXT,
    created_by TEXT DEFAULT 'user',
    priority INTEGER DEFAULT 0,
    rejection_notes TEXT,
    tg_topic_id INTEGER,
    significance TEXT DEFAULT 'medium',
    auto_execute INTEGER DEFAULT 0,
    source TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Copy data from old table to new table
  INSERT INTO tasks_new
  SELECT id, chat_id, description, status, result, session_id, tg_message_id, thinking_msg_id, type, title, plan, progress, created_by, priority, rejection_notes, tg_topic_id, significance, auto_execute, source, created_at, updated_at
  FROM tasks;

  -- Drop old table and rename new one
  DROP TABLE tasks;
  ALTER TABLE tasks_new RENAME TO tasks;

  -- Recreate indexes
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
  CREATE INDEX IF NOT EXISTS idx_tasks_chat ON tasks(chat_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);

  COMMIT;
`

module.exports = { MIGRATIONS, ADD_CONSTRAINTS_MIGRATION }

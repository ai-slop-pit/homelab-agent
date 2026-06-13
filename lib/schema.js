const MIGRATIONS = [
  "ALTER TABLE tasks ADD COLUMN session_id TEXT",
  "ALTER TABLE tasks ADD COLUMN tg_message_id TEXT",
  "ALTER TABLE tasks ADD COLUMN thinking_msg_id TEXT",
  "ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT 'chat'",
  "ALTER TABLE tasks ADD COLUMN title TEXT",
  "ALTER TABLE tasks ADD COLUMN plan TEXT",
  "ALTER TABLE tasks ADD COLUMN progress TEXT",
  "ALTER TABLE tasks ADD COLUMN created_by TEXT DEFAULT 'user'",
  "ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 0",
  "ALTER TABLE tasks ADD COLUMN rejection_notes TEXT",
  "ALTER TABLE tasks ADD COLUMN tg_topic_id INTEGER",
  "ALTER TABLE tasks ADD COLUMN significance TEXT DEFAULT 'medium'",
  "ALTER TABLE tasks ADD COLUMN auto_execute INTEGER DEFAULT 0",
  "ALTER TABLE tasks ADD COLUMN source TEXT",
  "CREATE TABLE IF NOT EXISTS metrics (key TEXT PRIMARY KEY, value INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_chat ON tasks(chat_id)",
  "CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC)",
]

module.exports = { MIGRATIONS }

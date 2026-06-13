const Database = require('better-sqlite3')

function initDatabase(dbPath) {
  const db = new Database(dbPath)

  db.exec(`CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'inbox',
  result TEXT,
  session_id TEXT,
  tg_message_id TEXT,
  thinking_msg_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`)

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
  ]

  for (const m of MIGRATIONS) {
    try { db.exec(m) } catch(e) {}
  }

  return db
}

module.exports = initDatabase

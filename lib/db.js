const Database = require('better-sqlite3')
const { MIGRATIONS } = require('./schema')
const DB_PATH = '/opt/claude-agent/tasks.db'

// Singleton instance
let dbInstance = null

function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH)
    dbInstance.exec(`CREATE TABLE IF NOT EXISTS tasks (
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
    runMigrations()
  }
  return dbInstance
}

function runMigrations() {
  for (const migration of MIGRATIONS) {
    try {
      dbInstance.exec(migration)
    } catch (e) {
      // Column already exists or other migration issue; ignore
    }
  }
}

function withTx(db, fn) {
  const tx = db.transaction(fn)
  return tx()
}

module.exports = {
  getDatabase,
  withTx,
  MIGRATIONS,
}

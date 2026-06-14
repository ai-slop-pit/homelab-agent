const Database = require('better-sqlite3')
const { MIGRATIONS, ADD_CONSTRAINTS_MIGRATION } = require('./schema')
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
    applyConstraintMigration()
  }
  return dbInstance
}

function runMigrations() {
  for (let i = 0; i < MIGRATIONS.length; i++) {
    const migration = MIGRATIONS[i]
    const migrationName = typeof migration === 'string' ? `migration_${i}` : migration.name
    const sql = typeof migration === 'string' ? migration : migration.sql

    try {
      dbInstance.exec(sql)
      console.log(`[migrations] Applied: ${migrationName} (${i + 1}/${MIGRATIONS.length})`)
    } catch (e) {
      const errMsg = e.message.toLowerCase()
      // Silently ignore already-applied migrations
      if (errMsg.includes('already exists') || errMsg.includes('duplicate column')) {
        console.log(`[migrations] Skipped (already applied): ${migrationName}`)
      } else {
        // Unexpected error - log with full context and halt startup
        console.error(`[migrations] ERROR in ${migrationName} (${i + 1}/${MIGRATIONS.length}):`)
        console.error(`[migrations] SQL: ${sql}`)
        console.error(`[migrations] Stack trace:`, e.stack)
        throw new Error(`Migration failed: ${migrationName} - ${e.message}`)
      }
    }
  }
}

function applyConstraintMigration() {
  try {
    // Check if tasks table already has proper constraints by looking for CHECK constraint
    const tableInfo = dbInstance.prepare("PRAGMA table_info(tasks)").all()
    const hasConstraints = tableInfo.some(col => col.name === 'status' && col.notnull)

    if (!hasConstraints) {
      // Execute the multi-statement transaction migration
      dbInstance.exec(ADD_CONSTRAINTS_MIGRATION)
      console.log('[migrations] Applied: add_constraints')
    } else {
      console.log('[migrations] Skipped (already applied): add_constraints')
    }
  } catch (e) {
    const errMsg = e.message.toLowerCase()
    // Only ignore table-already-exists errors
    if (errMsg.includes('already exists')) {
      console.log('[migrations] Skipped (already applied): add_constraints')
    } else {
      // Unexpected error - log with full context and halt startup
      console.error('[migrations] ERROR in add_constraints:')
      console.error('[migrations] Stack trace:', e.stack)
      throw new Error(`Constraint migration failed - ${e.message}`)
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

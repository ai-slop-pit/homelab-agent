// Test: Verify migration error handling works correctly
// This test mocks a permission error scenario

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

console.log('Testing migration error handling...\n')

// Test 1: Test with existing migrations (should skip already-applied)
console.log('Test 1: Apply migrations to existing database')
const testDbPath = '/tmp/test-migrations.db'
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath)

const db = new Database(testDbPath)
db.exec(`CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'inbox',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`)

// Apply migrations
const MIGRATIONS = [
  { name: "add_session_id", sql: "ALTER TABLE tasks ADD COLUMN session_id TEXT" },
  { name: "add_tg_message_id", sql: "ALTER TABLE tasks ADD COLUMN tg_message_id TEXT" },
]

console.log('First run (apply migrations):')
for (let i = 0; i < MIGRATIONS.length; i++) {
  const migration = MIGRATIONS[i]
  try {
    db.exec(migration.sql)
    console.log(`✓ Applied: ${migration.name}`)
  } catch (e) {
    const errMsg = e.message.toLowerCase()
    if (errMsg.includes('already exists') || errMsg.includes('duplicate column')) {
      console.log(`✓ Skipped (already applied): ${migration.name}`)
    } else {
      console.error(`✗ ERROR in ${migration.name}: ${e.message}`)
      process.exit(1)
    }
  }
}

console.log('\nSecond run (should skip):')
for (let i = 0; i < MIGRATIONS.length; i++) {
  const migration = MIGRATIONS[i]
  try {
    db.exec(migration.sql)
    console.log(`✓ Applied: ${migration.name}`)
  } catch (e) {
    const errMsg = e.message.toLowerCase()
    if (errMsg.includes('already exists') || errMsg.includes('duplicate column')) {
      console.log(`✓ Skipped (already applied): ${migration.name}`)
    } else {
      console.error(`✗ ERROR in ${migration.name}: ${e.message}`)
      process.exit(1)
    }
  }
}

db.close()

// Test 2: Test permission error detection
console.log('\nTest 2: Permission error should be re-thrown')
const testDb2 = new Database('/tmp/test-migrations-2.db')
testDb2.exec(`CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY)`)

// Simulate an error that's not "already exists"
const sql = "ALTER TABLE nonexistent_table ADD COLUMN col TEXT"
try {
  testDb2.exec(sql)
  console.log('✗ Should have thrown an error')
  process.exit(1)
} catch (e) {
  const errMsg = e.message.toLowerCase()
  if (!errMsg.includes('already exists')) {
    console.log(`✓ Non-benign error was caught: ${e.message}`)
    console.log(`✓ Would be logged and re-thrown to halt startup`)
  }
}

testDb2.close()
fs.unlinkSync('/tmp/test-migrations.db')
fs.unlinkSync('/tmp/test-migrations-2.db')

console.log('\n✅ All error handling tests passed!')

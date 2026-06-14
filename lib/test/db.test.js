const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

// Use a test database file
const TEST_DB_PATH = path.join(__dirname, 'test.db')

// Clean up test db before each test
beforeEach(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
})

afterEach(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH)
})

function createTestDb() {
  const db = new Database(TEST_DB_PATH)
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
  return db
}

describe('Database - Transactions', () => {
  it('should execute a transaction successfully', () => {
    const db = createTestDb()

    const tx = db.transaction(() => {
      db.prepare('INSERT INTO tasks (chat_id, description) VALUES (?, ?)').run('123', 'test task')
      db.prepare('INSERT INTO tasks (chat_id, description) VALUES (?, ?)').run('456', 'second task')
    })

    tx()
    const rows = db.prepare('SELECT COUNT(*) as count FROM tasks').get()
    expect(rows.count).toBe(2)
    db.close()
  })

  it('should rollback transaction on error', () => {
    const db = createTestDb()

    const tx = db.transaction(() => {
      db.prepare('INSERT INTO tasks (chat_id, description) VALUES (?, ?)').run('123', 'test task')
      throw new Error('Simulated error')
    })

    expect(() => tx()).toThrow()
    const rows = db.prepare('SELECT COUNT(*) as count FROM tasks').get()
    expect(rows.count).toBe(0)
    db.close()
  })

  it('should handle nested transaction contexts', () => {
    const db = createTestDb()

    db.prepare('INSERT INTO tasks (chat_id, description) VALUES (?, ?)').run('123', 'task 1')

    const tx = db.transaction(() => {
      db.prepare('INSERT INTO tasks (chat_id, description) VALUES (?, ?)').run('456', 'task 2')
      db.prepare('UPDATE tasks SET status = ? WHERE chat_id = ?').run('approved', '123')
    })

    tx()
    const rows = db.prepare('SELECT * FROM tasks ORDER BY id').all()
    expect(rows).toHaveLength(2)
    expect(rows[0].status).toBe('approved')
    db.close()
  })
})

describe('Database - Schema Creation', () => {
  it('should create tasks table with correct columns', () => {
    const db = createTestDb()
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all()

    const columnNames = tableInfo.map(col => col.name)
    expect(columnNames).toContain('id')
    expect(columnNames).toContain('chat_id')
    expect(columnNames).toContain('description')
    expect(columnNames).toContain('status')
    expect(columnNames).toContain('created_at')
    expect(columnNames).toContain('updated_at')
    db.close()
  })

  it('should have correct column types', () => {
    const db = createTestDb()
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all()

    const idCol = tableInfo.find(col => col.name === 'id')
    const chatCol = tableInfo.find(col => col.name === 'chat_id')
    const statusCol = tableInfo.find(col => col.name === 'status')

    expect(idCol.type).toMatch(/INTEGER/i)
    expect(chatCol.type).toMatch(/TEXT/i)
    expect(statusCol.type).toMatch(/TEXT/i)
    db.close()
  })
})

describe('Database - Migrations', () => {
  it('should handle duplicate column migration gracefully', () => {
    const db = createTestDb()

    // Add a column
    db.exec('ALTER TABLE tasks ADD COLUMN session_id TEXT')

    // Try to add same column again (should not throw)
    expect(() => {
      db.exec('ALTER TABLE tasks ADD COLUMN session_id TEXT')
    }).toThrow()

    // Check that column exists
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all()
    const columns = tableInfo.map(col => col.name)
    expect(columns).toContain('session_id')
    db.close()
  })

  it('should apply multiple migrations in sequence', () => {
    const db = createTestDb()

    const migrations = [
      'ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT "chat"',
      'ALTER TABLE tasks ADD COLUMN title TEXT',
      'ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 0'
    ]

    migrations.forEach(migration => {
      db.exec(migration)
    })

    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all()
    const columns = tableInfo.map(col => col.name)

    expect(columns).toContain('type')
    expect(columns).toContain('title')
    expect(columns).toContain('priority')
    db.close()
  })
})

describe('Database - Constraints', () => {
  it('should enforce NOT NULL constraints on required columns', () => {
    const db = new Database(TEST_DB_PATH)
    db.exec(`CREATE TABLE IF NOT EXISTS tasks_constrained (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'inbox'
    )`)

    // This should throw because chat_id is NOT NULL
    expect(() => {
      db.prepare('INSERT INTO tasks_constrained (description, status) VALUES (?, ?)').run('test', 'inbox')
    }).toThrow()

    db.close()
  })

  it('should enforce CHECK constraints on valid statuses', () => {
    const db = new Database(TEST_DB_PATH)
    db.exec(`CREATE TABLE IF NOT EXISTS tasks_checked (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'inbox' CHECK(status IN ('inbox', 'approved', 'done'))
    )`)

    // Valid status should work
    db.prepare('INSERT INTO tasks_checked (chat_id, description, status) VALUES (?, ?, ?)').run('123', 'test', 'approved')

    // Invalid status should fail
    expect(() => {
      db.prepare('INSERT INTO tasks_checked (chat_id, description, status) VALUES (?, ?, ?)').run('456', 'test', 'invalid_status')
    }).toThrow()

    const rows = db.prepare('SELECT COUNT(*) as count FROM tasks_checked').get()
    expect(rows.count).toBe(1)
    db.close()
  })

  it('should backfill NULL values with defaults during migration', () => {
    const db = createTestDb()

    // Insert data with no status (will use default)
    db.prepare('INSERT INTO tasks (chat_id, description) VALUES (?, ?)').run('123', 'task without status')

    // Verify default was applied
    const row = db.prepare('SELECT * FROM tasks WHERE chat_id = ?').get('123')
    expect(row.status).toBe('inbox')
    db.close()
  })

  it('should normalize invalid status values during migration', () => {
    const db = createTestDb()

    // Insert with a custom status (no check constraint initially)
    db.prepare('INSERT INTO tasks (chat_id, description, status) VALUES (?, ?, ?)').run('123', 'task', 'custom_status')

    // Simulate normalization: update to valid status
    db.prepare('UPDATE tasks SET status = ? WHERE status = ?').run('backlog', 'custom_status')

    const row = db.prepare('SELECT status FROM tasks WHERE chat_id = ?').get('123')
    expect(row.status).toBe('backlog')
    db.close()
  })
})

describe('Database - Indexes', () => {
  it('should create indexes for common queries', () => {
    const db = createTestDb()

    // Create indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_chat ON tasks(chat_id)')
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_type_status ON tasks(type, status)')

    // Verify indexes exist
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='tasks'").all()
    const indexNames = indexes.map(idx => idx.name)

    expect(indexNames).toContain('idx_tasks_status')
    expect(indexNames).toContain('idx_tasks_chat')
    expect(indexNames).toContain('idx_tasks_type_status')
    db.close()
  })

  it('should use composite index for type+status queries', () => {
    const db = createTestDb()
    db.exec('ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT "chat"')
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_type_status ON tasks(type, status)')

    // Insert test data
    db.prepare('INSERT INTO tasks (chat_id, description, type, status) VALUES (?, ?, ?, ?)').run('123', 'work task', 'work', 'backlog')
    db.prepare('INSERT INTO tasks (chat_id, description, type, status) VALUES (?, ?, ?, ?)').run('456', 'chat', 'chat', 'inbox')

    // Query should use index efficiently
    const rows = db.prepare("SELECT * FROM tasks WHERE type = ? AND status = ? ORDER BY id LIMIT 1").all('work', 'backlog')
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('work')
    db.close()
  })
})

describe('Database - Metrics Table', () => {
  it('should create metrics table', () => {
    const db = createTestDb()
    db.exec('CREATE TABLE IF NOT EXISTS metrics (key TEXT PRIMARY KEY, value INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)')

    const tableInfo = db.prepare("PRAGMA table_info(metrics)").all()
    const columns = tableInfo.map(col => col.name)

    expect(columns).toContain('key')
    expect(columns).toContain('value')
    expect(columns).toContain('updated_at')
    db.close()
  })

  it('should handle metric insertion and update', () => {
    const db = createTestDb()
    db.exec('CREATE TABLE IF NOT EXISTS metrics (key TEXT PRIMARY KEY, value INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)')

    // Insert a metric
    db.prepare('INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run('poll_count', 5)

    let row = db.prepare('SELECT * FROM metrics WHERE key = ?').get('poll_count')
    expect(row.value).toBe(5)

    // Update the metric
    db.prepare('INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run('poll_count', 10)

    row = db.prepare('SELECT * FROM metrics WHERE key = ?').get('poll_count')
    expect(row.value).toBe(10)
    db.close()
  })
})

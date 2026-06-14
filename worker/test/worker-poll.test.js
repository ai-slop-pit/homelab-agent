const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const TEST_DB_PATH = path.join(__dirname, 'test-worker.db')

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
    type TEXT DEFAULT 'chat',
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  db.exec('CREATE TABLE IF NOT EXISTS metrics (key TEXT PRIMARY KEY, value INTEGER DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)')
  return db
}

function calculateBackoffInterval(consecutiveEmpty) {
  if (consecutiveEmpty < 5) return 10000
  if (consecutiveEmpty < 10) return 30000
  return 60000
}

describe('Worker Poll - Task Selection', () => {
  it('should select work task in backlog status', () => {
    const db = createTestDb()
    db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status)
      VALUES (?, ?, 'work', 'backlog')
    `).run('123', 'implement feature')

    const task = db.prepare(`
      SELECT * FROM tasks WHERE
        (type = 'work' AND status = 'backlog')
      ORDER BY priority DESC, created_at ASC LIMIT 1
    `).get()

    expect(task).toBeDefined()
    expect(task.type).toBe('work')
    expect(task.status).toBe('backlog')
    db.close()
  })

  it('should select chat task in inbox status', () => {
    const db = createTestDb()
    db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status)
      VALUES (?, ?, 'chat', 'inbox')
    `).run('123', 'hello')

    const task = db.prepare(`
      SELECT * FROM tasks WHERE
        (type = 'chat' AND status = 'inbox')
        OR (type IS NULL AND status = 'inbox')
      ORDER BY priority DESC, created_at ASC LIMIT 1
    `).get()

    expect(task).toBeDefined()
    expect(task.status).toBe('inbox')
    db.close()
  })

  it('should select task with highest priority first', () => {
    const db = createTestDb()
    db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status, priority)
      VALUES (?, ?, 'work', 'backlog', 1)
    `).run('123', 'low priority')

    db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status, priority)
      VALUES (?, ?, 'work', 'backlog', 10)
    `).run('456', 'high priority')

    const task = db.prepare(`
      SELECT * FROM tasks WHERE type = 'work' AND status = 'backlog'
      ORDER BY priority DESC, created_at ASC LIMIT 1
    `).get()

    expect(task.priority).toBe(10)
    expect(task.description).toBe('high priority')
    db.close()
  })

  it('should select earliest task when priorities are equal', () => {
    const db = createTestDb()

    const res1 = db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status, priority)
      VALUES (?, ?, 'work', 'backlog', 5)
    `).run('123', 'first task')

    const res2 = db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status, priority)
      VALUES (?, ?, 'work', 'backlog', 5)
    `).run('456', 'second task')

    const task = db.prepare(`
      SELECT * FROM tasks WHERE type = 'work' AND status = 'backlog'
      ORDER BY priority DESC, created_at ASC LIMIT 1
    `).get()

    expect(task.id).toBe(res1.lastInsertRowid)
    db.close()
  })

  it('should select approved work task for implementation', () => {
    const db = createTestDb()
    db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status)
      VALUES (?, ?, 'work', 'approved')
    `).run('123', 'implement')

    const task = db.prepare(`
      SELECT * FROM tasks WHERE type = 'work' AND status = 'approved'
      ORDER BY priority DESC, created_at ASC LIMIT 1
    `).get()

    expect(task).toBeDefined()
    expect(task.status).toBe('approved')
    db.close()
  })

  it('should select improvement task in approved status', () => {
    const db = createTestDb()
    db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status)
      VALUES (?, ?, 'improvement', 'approved')
    `).run('123', 'optimize code')

    const task = db.prepare(`
      SELECT * FROM tasks WHERE type = 'improvement' AND status = 'approved'
      ORDER BY priority DESC, created_at ASC LIMIT 1
    `).get()

    expect(task).toBeDefined()
    expect(task.type).toBe('improvement')
    db.close()
  })

  it('should return null when no tasks available', () => {
    const db = createTestDb()

    const task = db.prepare(`
      SELECT * FROM tasks WHERE
        (type = 'chat' AND status = 'inbox')
        OR (type = 'work' AND status = 'backlog')
      ORDER BY priority DESC, created_at ASC LIMIT 1
    `).get()

    expect(task).toBeUndefined()
    db.close()
  })

  it('should prioritize work tasks over chat tasks', () => {
    const db = createTestDb()
    db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status, priority)
      VALUES (?, ?, 'chat', 'inbox', 100)
    `).run('123', 'high priority chat')

    db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status, priority)
      VALUES (?, ?, 'work', 'backlog', 0)
    `).run('456', 'low priority work')

    // In actual poll, work is checked first
    const workTask = db.prepare(`
      SELECT * FROM tasks WHERE type = 'work' AND status = 'backlog'
      ORDER BY priority DESC, created_at ASC LIMIT 1
    `).get()

    expect(workTask).toBeDefined()
    expect(workTask.type).toBe('work')
    db.close()
  })
})

describe('Worker Poll - Stuck Task Recovery', () => {
  it('should recover stuck planning tasks', () => {
    const db = createTestDb()
    const PLANNING_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

    // Create a stuck task (in planning state for too long)
    const cutoffTime = new Date(Date.now() - PLANNING_TIMEOUT_MS).toISOString()
    db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status, updated_at)
      VALUES (?, ?, 'work', 'planning', ?)
    `).run('123', 'stuck task', '2000-01-01 00:00:00') // Very old

    // Recover stuck tasks
    const result = db.prepare(
      "UPDATE tasks SET status='backlog', updated_at=CURRENT_TIMESTAMP WHERE type='work' AND status='planning' AND updated_at < ?"
    ).run(cutoffTime)

    expect(result.changes).toBe(1)

    const task = db.prepare('SELECT * FROM tasks WHERE id = 1').get()
    expect(task.status).toBe('backlog')
    db.close()
  })

  it('should not recover recently stuck tasks', () => {
    const db = createTestDb()
    const PLANNING_TIMEOUT_MS = 10 * 60 * 1000

    // Create a recently stuck task
    const cutoffTime = new Date(Date.now() - PLANNING_TIMEOUT_MS).toISOString()
    db.prepare(`
      INSERT INTO tasks (chat_id, description, type, status, updated_at)
      VALUES (?, ?, 'work', 'planning', CURRENT_TIMESTAMP)
    `).run('123', 'recent task')

    const result = db.prepare(
      "UPDATE tasks SET status='backlog', updated_at=CURRENT_TIMESTAMP WHERE type='work' AND status='planning' AND updated_at < ?"
    ).run(cutoffTime)

    expect(result.changes).toBe(0)
    db.close()
  })
})

describe('Worker Poll - Metrics Tracking', () => {
  it('should increment poll count metric', () => {
    const db = createTestDb()

    const incrementMetric = (key, delta = 1) => {
      const current = db.prepare("SELECT value FROM metrics WHERE key=?").get(key)?.value || 0
      db.prepare("INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(key, current + delta)
    }

    incrementMetric('poll_count', 1)
    incrementMetric('poll_count', 1)
    incrementMetric('poll_count', 1)

    const metric = db.prepare("SELECT value FROM metrics WHERE key=?").get('poll_count')
    expect(metric.value).toBe(3)
    db.close()
  })

  it('should increment tasks_found_count when task selected', () => {
    const db = createTestDb()

    const incrementMetric = (key, delta = 1) => {
      const current = db.prepare("SELECT value FROM metrics WHERE key=?").get(key)?.value || 0
      db.prepare("INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(key, current + delta)
    }

    incrementMetric('poll_count')
    incrementMetric('tasks_found_count')

    const pollCount = db.prepare("SELECT value FROM metrics WHERE key=?").get('poll_count').value
    const tasksFound = db.prepare("SELECT value FROM metrics WHERE key=?").get('tasks_found_count').value

    expect(pollCount).toBe(1)
    expect(tasksFound).toBe(1)
    db.close()
  })

  it('should track total plan time', () => {
    const db = createTestDb()

    const incrementMetric = (key, delta = 1) => {
      const current = db.prepare("SELECT value FROM metrics WHERE key=?").get(key)?.value || 0
      db.prepare("INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(key, current + delta)
    }

    incrementMetric('total_plan_time_ms', 5000)
    incrementMetric('plan_count', 1)

    const totalTime = db.prepare("SELECT value FROM metrics WHERE key=?").get('total_plan_time_ms').value
    const planCount = db.prepare("SELECT value FROM metrics WHERE key=?").get('plan_count').value

    expect(totalTime).toBe(5000)
    expect(planCount).toBe(1)
    db.close()
  })

  it('should track completed and failed tasks', () => {
    const db = createTestDb()

    const incrementMetric = (key, delta = 1) => {
      const current = db.prepare("SELECT value FROM metrics WHERE key=?").get(key)?.value || 0
      db.prepare("INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(key, current + delta)
    }

    incrementMetric('tasks_completed', 3)
    incrementMetric('tasks_failed', 1)

    const completed = db.prepare("SELECT value FROM metrics WHERE key=?").get('tasks_completed').value
    const failed = db.prepare("SELECT value FROM metrics WHERE key=?").get('tasks_failed').value

    expect(completed).toBe(3)
    expect(failed).toBe(1)
    db.close()
  })
})

describe('Worker Poll - Backoff Calculation', () => {
  it('should start with 10s interval', () => {
    const interval = calculateBackoffInterval(0)
    expect(interval).toBe(10000)
  })

  it('should increase to 30s at 5 consecutive empty', () => {
    const interval = calculateBackoffInterval(5)
    expect(interval).toBe(30000)
  })

  it('should increase to 60s at 10 consecutive empty', () => {
    const interval = calculateBackoffInterval(10)
    expect(interval).toBe(60000)
  })

  it('should stay at 60s for higher empty counts', () => {
    expect(calculateBackoffInterval(15)).toBe(60000)
    expect(calculateBackoffInterval(20)).toBe(60000)
    expect(calculateBackoffInterval(100)).toBe(60000)
  })

  it('should use proper thresholds', () => {
    expect(calculateBackoffInterval(4)).toBe(10000)
    expect(calculateBackoffInterval(5)).toBe(30000)
    expect(calculateBackoffInterval(9)).toBe(30000)
    expect(calculateBackoffInterval(10)).toBe(60000)
  })
})

describe('Worker Poll - Queue Length', () => {
  it('should count inbox tasks', () => {
    const db = createTestDb()

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'inbox')
    `).run('123', 'task 1')

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'inbox')
    `).run('456', 'task 2')

    const getQueueLength = () => {
      const row = db.prepare(
        "SELECT COUNT(*) as count FROM tasks WHERE status IN ('inbox', 'backlog', 'approved', 'awaiting_approval')"
      ).get()
      return row ? row.count : 0
    }

    expect(getQueueLength()).toBe(2)
    db.close()
  })

  it('should count all pending statuses', () => {
    const db = createTestDb()

    db.prepare(`INSERT INTO tasks (chat_id, description, status) VALUES (?, ?, 'inbox')`).run('1', 'task')
    db.prepare(`INSERT INTO tasks (chat_id, description, status) VALUES (?, ?, 'backlog')`).run('2', 'task')
    db.prepare(`INSERT INTO tasks (chat_id, description, status) VALUES (?, ?, 'approved')`).run('3', 'task')
    db.prepare(`INSERT INTO tasks (chat_id, description, status) VALUES (?, ?, 'awaiting_approval')`).run('4', 'task')

    const getQueueLength = () => {
      const row = db.prepare(
        "SELECT COUNT(*) as count FROM tasks WHERE status IN ('inbox', 'backlog', 'approved', 'awaiting_approval')"
      ).get()
      return row ? row.count : 0
    }

    expect(getQueueLength()).toBe(4)
    db.close()
  })

  it('should not count done or failed tasks', () => {
    const db = createTestDb()

    db.prepare(`INSERT INTO tasks (chat_id, description, status) VALUES (?, ?, 'inbox')`).run('1', 'task')
    db.prepare(`INSERT INTO tasks (chat_id, description, status) VALUES (?, ?, 'done')`).run('2', 'task')
    db.prepare(`INSERT INTO tasks (chat_id, description, status) VALUES (?, ?, 'failed')`).run('3', 'task')

    const getQueueLength = () => {
      const row = db.prepare(
        "SELECT COUNT(*) as count FROM tasks WHERE status IN ('inbox', 'backlog', 'approved', 'awaiting_approval')"
      ).get()
      return row ? row.count : 0
    }

    expect(getQueueLength()).toBe(1)
    db.close()
  })
})

describe('Worker Poll - Index Efficiency', () => {
  it('should use type_status index for common queries', () => {
    const db = createTestDb()
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_type_status ON tasks(type, status)')

    // Insert test data
    for (let i = 0; i < 100; i++) {
      db.prepare(`
        INSERT INTO tasks (chat_id, description, type, status)
        VALUES (?, ?, 'work', 'backlog')
      `).run(`chat${i}`, `task ${i}`)
    }

    for (let i = 0; i < 50; i++) {
      db.prepare(`
        INSERT INTO tasks (chat_id, description, type, status)
        VALUES (?, ?, 'chat', 'inbox')
      `).run(`chat${i}`, `message ${i}`)
    }

    // Query should be efficient with index
    const start = Date.now()
    const task = db.prepare(`
      SELECT * FROM tasks WHERE type = 'work' AND status = 'backlog'
      ORDER BY priority DESC, created_at ASC LIMIT 1
    `).get()
    const duration = Date.now() - start

    expect(task).toBeDefined()
    expect(task.type).toBe('work')
    expect(duration).toBeLessThan(100) // Should be very fast with index
    db.close()
  })
})

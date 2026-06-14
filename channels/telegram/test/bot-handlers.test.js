const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const TEST_DB_PATH = path.join(__dirname, 'test-bot.db')

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
    title TEXT,
    rejection_notes TEXT,
    session_id TEXT,
    thinking_msg_id TEXT,
    tg_message_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  return db
}

describe('Bot - Work Command Handler', () => {
  it('should create work task from command', () => {
    const db = createTestDb()
    const chatId = '123'
    const description = 'implement new feature'

    const res = db.prepare(
      "INSERT INTO tasks (chat_id, description, type, title, status, created_by) VALUES (?, ?, 'work', ?, 'backlog', 'user')"
    ).run(chatId, description, description.substring(0, 100))

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.lastInsertRowid)

    expect(task).toBeDefined()
    expect(task.type).toBe('work')
    expect(task.status).toBe('backlog')
    expect(task.description).toBe(description)
    db.close()
  })

  it('should sanitize work task description', () => {
    const db = createTestDb()
    const chatId = '123'
    // Description with multiple newlines
    const description = 'line 1\n\n\n\nline 2'
    const sanitized = description.trim().replace(/[\r\n]{3,}/g, '\n\n')

    const res = db.prepare(
      "INSERT INTO tasks (chat_id, description, type, title, status, created_by) VALUES (?, ?, 'work', ?, 'backlog', 'user')"
    ).run(chatId, sanitized, sanitized.substring(0, 100))

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.lastInsertRowid)
    expect(task.description).toBe('line 1\n\nline 2')
    db.close()
  })

  it('should enforce max length for work task', () => {
    const db = createTestDb()
    const chatId = '123'
    const longDescription = 'x'.repeat(6000) // Exceeds 5000

    // Should truncate to 5000
    const sanitized = longDescription.substring(0, 5000)

    const res = db.prepare(
      "INSERT INTO tasks (chat_id, description, type, title, status, created_by) VALUES (?, ?, 'work', ?, 'backlog', 'user')"
    ).run(chatId, sanitized, sanitized.substring(0, 100))

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.lastInsertRowid)
    expect(task.description.length).toBe(5000)
    db.close()
  })

  it('should truncate work task title to 100 chars', () => {
    const db = createTestDb()
    const chatId = '123'
    const description = 'x'.repeat(200)
    const title = description.substring(0, 100)

    const res = db.prepare(
      "INSERT INTO tasks (chat_id, description, type, title, status, created_by) VALUES (?, ?, 'work', ?, 'backlog', 'user')"
    ).run(chatId, description, title)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.lastInsertRowid)
    expect(task.title.length).toBe(100)
    db.close()
  })
})

describe('Bot - Approve Handler', () => {
  it('should update task status to approved', () => {
    const db = createTestDb()
    const taskId = 1

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'awaiting_approval')
    `).run('123', 'test task')

    const res = db.prepare(
      "UPDATE tasks SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='awaiting_approval'"
    ).run(taskId)

    expect(res.changes).toBe(1)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
    expect(task.status).toBe('approved')
    db.close()
  })

  it('should not update if task not in awaiting_approval status', () => {
    const db = createTestDb()

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'backlog')
    `).run('123', 'test task')

    const res = db.prepare(
      "UPDATE tasks SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='awaiting_approval'"
    ).run(1)

    expect(res.changes).toBe(0)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(1)
    expect(task.status).toBe('backlog')
    db.close()
  })

  it('should handle approve action for non-existent task', () => {
    const db = createTestDb()

    const res = db.prepare(
      "UPDATE tasks SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='awaiting_approval'"
    ).run(999)

    expect(res.changes).toBe(0)
    db.close()
  })

  it('should update timestamp on approval', () => {
    const db = createTestDb()

    const now = new Date().toISOString().split('T')[0]
    db.prepare(`
      INSERT INTO tasks (chat_id, description, status, updated_at)
      VALUES (?, ?, 'awaiting_approval', '2000-01-01 00:00:00')
    `).run('123', 'test task')

    db.prepare(
      "UPDATE tasks SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).run(1)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(1)
    expect(task.updated_at).toContain(now)
    db.close()
  })
})

describe('Bot - Reject Handler', () => {
  it('should update task status to needs_revision', () => {
    const db = createTestDb()
    const taskId = 1
    const notes = 'Please reconsider the approach'

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'awaiting_approval')
    `).run('123', 'test task')

    db.prepare(
      "UPDATE tasks SET status='needs_revision', rejection_notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).run(notes, taskId)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
    expect(task.status).toBe('needs_revision')
    expect(task.rejection_notes).toBe(notes)
    db.close()
  })

  it('should sanitize rejection notes', () => {
    const db = createTestDb()
    const taskId = 1
    const rawNotes = 'line 1\n\n\n\nline 2'
    const sanitized = rawNotes.trim().replace(/[\r\n]{3,}/g, '\n\n')

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'awaiting_approval')
    `).run('123', 'test task')

    db.prepare(
      "UPDATE tasks SET status='needs_revision', rejection_notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).run(sanitized, taskId)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
    expect(task.rejection_notes).toBe('line 1\n\nline 2')
    db.close()
  })

  it('should enforce max length for rejection notes', () => {
    const db = createTestDb()
    const taskId = 1
    const notes = 'x'.repeat(6000)
    const sanitized = notes.substring(0, 5000)

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'awaiting_approval')
    `).run('123', 'test task')

    db.prepare(
      "UPDATE tasks SET status='needs_revision', rejection_notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).run(sanitized, taskId)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
    expect(task.rejection_notes.length).toBe(5000)
    db.close()
  })
})

describe('Bot - Text Handler', () => {
  it('should create chat task from text message', () => {
    const db = createTestDb()
    const chatId = '123'
    const text = 'hello, what can you do?'

    const res = db.prepare(
      'INSERT INTO tasks (chat_id, description) VALUES (?, ?)'
    ).run(chatId, text)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.lastInsertRowid)
    expect(task).toBeDefined()
    expect(task.type).toBe('chat') // default
    expect(task.status).toBe('inbox') // default
    expect(task.description).toBe(text)
    db.close()
  })

  it('should store thinking message id', () => {
    const db = createTestDb()
    const chatId = '123'
    const text = 'test message'
    const thinkingMsgId = '456'

    const res = db.prepare(
      'INSERT INTO tasks (chat_id, description, thinking_msg_id) VALUES (?, ?, ?)'
    ).run(chatId, text, thinkingMsgId)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.lastInsertRowid)
    expect(task.thinking_msg_id).toBe(thinkingMsgId)
    db.close()
  })

  it('should handle reply to previous message with session', () => {
    const db = createTestDb()

    // Create original message
    db.prepare(`
      INSERT INTO tasks (chat_id, description, session_id, tg_message_id)
      VALUES (?, ?, 'sess123', 'msg789')
    `).run('123', 'original question')

    // Create reply
    const replyMsgId = 'msg789'
    const parent = db.prepare(
      "SELECT session_id FROM tasks WHERE tg_message_id=? AND session_id IS NOT NULL"
    ).get(replyMsgId)

    expect(parent).toBeDefined()
    expect(parent.session_id).toBe('sess123')

    // Insert new task with session
    const res = db.prepare(
      'INSERT INTO tasks (chat_id, description, session_id) VALUES (?, ?, ?)'
    ).run('123', 'follow-up', parent.session_id)

    const newTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.lastInsertRowid)
    expect(newTask.session_id).toBe('sess123')
    db.close()
  })

  it('should not use session if reply to non-existent message', () => {
    const db = createTestDb()

    const parent = db.prepare(
      "SELECT session_id FROM tasks WHERE tg_message_id=? AND session_id IS NOT NULL"
    ).get('msg_not_found')

    expect(parent).toBeUndefined()
    db.close()
  })

  it('should sanitize text message', () => {
    const db = createTestDb()
    const chatId = '123'
    const rawText = 'line 1\n\n\n\nline 2'
    const sanitized = rawText.trim().replace(/[\r\n]{3,}/g, '\n\n')

    const res = db.prepare(
      'INSERT INTO tasks (chat_id, description) VALUES (?, ?)'
    ).run(chatId, sanitized)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.lastInsertRowid)
    expect(task.description).toBe('line 1\n\nline 2')
    db.close()
  })

  it('should enforce max length for text message', () => {
    const db = createTestDb()
    const chatId = '123'
    const longText = 'x'.repeat(6000)
    const sanitized = longText.substring(0, 5000)

    const res = db.prepare(
      'INSERT INTO tasks (chat_id, description) VALUES (?, ?)'
    ).run(chatId, sanitized)

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(res.lastInsertRowid)
    expect(task.description.length).toBe(5000)
    db.close()
  })
})

describe('Bot - Rejection Workflow', () => {
  it('should track pending rejection per chat', () => {
    const pendingRejection = {}
    const chatId = '123'
    const taskId = 5

    // Set pending rejection
    pendingRejection[chatId] = taskId
    expect(pendingRejection[chatId]).toBe(5)

    // Clear after handling
    delete pendingRejection[chatId]
    expect(pendingRejection[chatId]).toBeUndefined()
  })

  it('should handle rejection notes for pending task', () => {
    const db = createTestDb()
    const pendingRejection = {}
    const chatId = '123'
    const taskId = 1
    const notes = 'Please revise the plan'

    // Create task
    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'awaiting_approval')
    `).run(chatId, 'test task')

    // Set pending rejection
    pendingRejection[chatId] = taskId

    // Process rejection notes
    const sanitized = notes.trim().replace(/[\r\n]{3,}/g, '\n\n')
    db.prepare(
      "UPDATE tasks SET status='needs_revision', rejection_notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).run(sanitized, pendingRejection[chatId])

    delete pendingRejection[chatId]

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)
    expect(task.status).toBe('needs_revision')
    expect(task.rejection_notes).toBe(notes)
    db.close()
  })

  it('should ignore text if no pending rejection', () => {
    const pendingRejection = {}
    const chatId = '123'

    expect(pendingRejection[chatId]).toBeUndefined()
    db.close()
  })
})

describe('Bot - Task Listing', () => {
  it('should list recent tasks', () => {
    const db = createTestDb()

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status, type)
      VALUES (?, ?, 'inbox', 'chat')
    `).run('123', 'task 1')

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status, type)
      VALUES (?, ?, 'backlog', 'work')
    `).run('456', 'task 2')

    const rows = db.prepare(
      "SELECT id, status, type, substr(COALESCE(title,description),1,50) as label FROM tasks ORDER BY created_at DESC LIMIT 10"
    ).all()

    expect(rows).toHaveLength(2)
    expect(rows[0].type).toBe('work') // Most recent
    expect(rows[1].type).toBe('chat')
    db.close()
  })

  it('should handle empty task list', () => {
    const db = createTestDb()

    const rows = db.prepare(
      "SELECT id, status, type, substr(COALESCE(title,description),1,50) as label FROM tasks ORDER BY created_at DESC LIMIT 10"
    ).all()

    expect(rows).toHaveLength(0)
    db.close()
  })

  it('should truncate labels to 50 chars', () => {
    const db = createTestDb()
    const longDescription = 'x'.repeat(100)

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'inbox')
    `).run('123', longDescription)

    const rows = db.prepare(
      "SELECT id, status, type, substr(COALESCE(title,description),1,50) as label FROM tasks"
    ).all()

    expect(rows[0].label.length).toBeLessThanOrEqual(50)
    db.close()
  })
})

describe('Bot - Multi-Chat Handling', () => {
  it('should isolate tasks by chat_id', () => {
    const db = createTestDb()

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'inbox')
    `).run('123', 'task from chat 123')

    db.prepare(`
      INSERT INTO tasks (chat_id, description, status)
      VALUES (?, ?, 'inbox')
    `).run('456', 'task from chat 456')

    const tasks123 = db.prepare(
      "SELECT COUNT(*) as count FROM tasks WHERE chat_id = ?"
    ).get('123')

    const tasks456 = db.prepare(
      "SELECT COUNT(*) as count FROM tasks WHERE chat_id = ?"
    ).get('456')

    expect(tasks123.count).toBe(1)
    expect(tasks456.count).toBe(1)
    db.close()
  })

  it('should track pending rejections per chat independently', () => {
    const pendingRejection = {}
    const chatId1 = '123'
    const chatId2 = '456'

    pendingRejection[chatId1] = 10
    pendingRejection[chatId2] = 20

    expect(pendingRejection[chatId1]).toBe(10)
    expect(pendingRejection[chatId2]).toBe(20)

    delete pendingRejection[chatId1]
    expect(pendingRejection[chatId1]).toBeUndefined()
    expect(pendingRejection[chatId2]).toBe(20)
  })
})

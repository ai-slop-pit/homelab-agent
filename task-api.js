#!/usr/bin/env node
require('dotenv').config({ path: '/opt/claude-agent/.env' })
const Database = require('better-sqlite3')
const { validateTitle, validateDescription } = require('./lib/validate')

const db = new Database('/opt/claude-agent/tasks.db')
const taskId = parseInt(process.env.CURRENT_TASK_ID)
const args = process.argv.slice(2)
const cmd = args[0]

function ts() { return '[' + new Date().toTimeString().substring(0, 8) + ']' }

function appendProgress(id, msg) {
  const row = db.prepare('SELECT progress FROM tasks WHERE id=?').get(id)
  const prev = row && row.progress ? row.progress : ''
  const line = ts() + ' ' + msg
  db.prepare('UPDATE tasks SET progress=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(prev ? prev + '\n' + line : line, id)
}

if (cmd === 'progress') {
  if (!taskId) { console.error('CURRENT_TASK_ID not set'); process.exit(1) }
  const msg = args.slice(1).join(' ')
  if (!msg) { console.error('Usage: task-api.js progress <message>'); process.exit(1) }
  appendProgress(taskId, msg)
  console.log('Progress: ' + msg)
} else if (cmd === 'blocked') {
  if (!taskId) { console.error('CURRENT_TASK_ID not set'); process.exit(1) }
  const msg = args.slice(1).join(' ')
  appendProgress(taskId, 'BLOCKED: ' + msg)
  db.prepare("UPDATE tasks SET status='blocked', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(taskId)
  console.log('Blocked: ' + msg)
} else if (cmd === 'create') {
  let title = '', description = ''
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--title') title = args[++i] || ''
    else if (args[i] === '--description') description = args[++i] || ''
  }
  if (!title) { console.error('Usage: task-api.js create --title "X" [--description "Y"]'); process.exit(1) }
  title = validateTitle(title)
  if (!description) description = title
  description = validateDescription(description)
  let chatId = ''
  if (taskId) {
    const parent = db.prepare('SELECT chat_id FROM tasks WHERE id=?').get(taskId)
    if (parent) chatId = parent.chat_id
  }
  const res = db.prepare(
    "INSERT INTO tasks (chat_id, description, type, title, status, created_by) VALUES (?, ?, 'work', ?, 'backlog', 'agent')"
  ).run(chatId, description, title)
  console.log('Created work task #' + res.lastInsertRowid + ': ' + title)
} else {
  console.error('Commands: progress <msg> | blocked <msg> | create --title X [--description Y]')
  process.exit(1)
}

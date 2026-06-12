require('dotenv').config({ path: '/opt/claude-agent/.env' })
const Database = require('better-sqlite3')
const { spawn } = require('child_process')
const https = require('https')

const DB_PATH = '/opt/claude-agent/tasks.db'
const POLL_INTERVAL = 10000
const BOT_TOKEN = process.env.BOT_TOKEN
const GROUP_ID = process.env.GROUP_ID
const PLANNING_TIMEOUT_MS = 10 * 60 * 1000

const db = new Database(DB_PATH)
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
for (const m of MIGRATIONS) { try { db.exec(m) } catch(e) {} }

function log(msg) { console.log('[' + new Date().toISOString() + '] ' + msg) }

// ── Telegram ──────────────────────────────────────────────────────────────────

function tgPost(path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const req = https.request({
      hostname: 'api.telegram.org',
      path: '/bot' + BOT_TOKEN + path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch(e) { resolve(null) } })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function sendMsg(chatId, text, opts) {
  const res = await tgPost('/sendMessage', Object.assign({ chat_id: chatId, text }, opts || {}))
  return res && res.result ? res.result.message_id : null
}

async function deleteMsg(chatId, msgId) {
  return tgPost('/deleteMessage', { chat_id: chatId, message_id: parseInt(msgId) })
}

async function sendTyping(chatId) {
  return tgPost('/sendChatAction', { chat_id: chatId, action: 'typing' })
}

async function createTopic(name) {
  if (!GROUP_ID) return null
  try {
    const res = await tgPost('/createForumTopic', { chat_id: GROUP_ID, name: name.substring(0, 128) })
    if (res && res.result) return res.result.message_thread_id
  } catch(e) { log('createTopic failed: ' + e.message) }
  return null
}

async function closeTopic(topicId) {
  if (!GROUP_ID || !topicId) return
  try { await tgPost('/closeForumTopic', { chat_id: GROUP_ID, message_thread_id: topicId }) } catch(e) {}
}

async function topicMsg(topicId, text, parseMode) {
  if (!GROUP_ID || !topicId) return
  return sendMsg(GROUP_ID, text, Object.assign({ message_thread_id: topicId }, parseMode ? { parse_mode: parseMode } : {}))
}

// ── Claude runner ─────────────────────────────────────────────────────────────

function runClaude(prompt, opts) {
  opts = opts || {}
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'json']
    if (opts.dangerousSkip) args.push('--dangerously-skip-permissions')
    if (opts.addDir)        args.push('--add-dir', opts.addDir)
    if (opts.sysPrompt)     args.push('--append-system-prompt', opts.sysPrompt)
    if (opts.resume)        args.push('--resume', opts.resume)

    const env = Object.assign({}, process.env, { HOME: '/root' }, opts.env || {})
    const claude = spawn('claude', args, { cwd: '/opt/claude-agent', timeout: 600000, env })

    let out = '', err = ''
    claude.stdout.on('data', d => out += d)
    claude.stderr.on('data', d => err += d)
    claude.on('close', code => {
      if (code !== 0) return reject(new Error('Claude exit ' + code + ': ' + err.substring(0, 200)))
      let result = '', sessionId = null
      for (const line of out.trim().split('\n')) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line)
          if (obj.session_id) sessionId = obj.session_id
          if (obj.type === 'result') result = obj.result || ''
        } catch(e) {}
      }
      if (!result) result = out.trim()
      resolve({ result, sessionId })
    })
    claude.on('error', reject)
  })
}

// ── Reflection ────────────────────────────────────────────────────────────────

async function reflect(description, result) {
  const prompt = [
    'You just completed a chat task. Run Reflect-Distill-Evolve.',
    'TASK: ' + description.substring(0, 300),
    'RESULT: ' + result.substring(0, 400),
    '1. Anything new for memory or skills?',
    '2. Non-trivial improvement worth a work task?',
    '   If yes: node /opt/claude-agent/task-api.js create --title "X" --description "Y"',
    '3. Nothing new? Output exactly: NOTHING',
  ].join('\n')
  try {
    const { result: r } = await runClaude(prompt, { addDir: '/opt/claude-agent' })
    if (r && r.trim() !== 'NOTHING') log('Reflect: ' + r.substring(0, 100))
  } catch(e) { log('Reflect failed: ' + e.message) }
}

// ── Work: Plan ────────────────────────────────────────────────────────────────

async function planTask(task) {
  log('Planning #' + task.id + ': ' + (task.title || task.description).substring(0, 50))
  const claimed = db.prepare(
    'UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?'
  ).run('planning', task.id, task.status)
  if (claimed.changes === 0) return

  const isRevision = task.status === 'needs_revision'
  const prompt = [
    'You are planning a work task. Read relevant memory and code files first.',
    'Title: ' + (task.title || task.description.substring(0, 80)),
    'Description: ' + task.description,
    isRevision ? 'PREVIOUS PLAN REJECTED. Revision notes: ' + task.rejection_notes + '\nRevise the plan to address these.' : '',
    'Write a concise implementation plan (max 400 words): exact steps, files to touch, risks, expected outcome.',
    'Respond with ONLY the plan text.',
  ].filter(Boolean).join('\n')

  try {
    const { result: plan } = await runClaude(prompt, { addDir: '/opt/claude-agent' })
    const title = task.title || task.description.substring(0, 80)
    const topicId = await createTopic('📋 ' + title)
    if (topicId) await topicMsg(topicId, '*Plan ready for review*\n\n' + plan.substring(0, 3500), 'Markdown')

    const preview = plan.substring(0, 700) + (plan.length > 700 ? '...' : '')
    await sendMsg(task.chat_id, '📋 *Plan: ' + title + '*\n\n' + preview, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[
        { text: '✅ Approve', callback_data: 'approve_' + task.id },
        { text: '✏️ Revise',  callback_data: 'reject_'  + task.id }
      ]]}
    })

    db.prepare(
      'UPDATE tasks SET status=?, plan=?, tg_topic_id=?, rejection_notes=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).run('awaiting_approval', plan, topicId, task.id)
    log('Task #' + task.id + ' awaiting approval')
  } catch(e) {
    log('Planning failed #' + task.id + ': ' + e.message)
    db.prepare("UPDATE tasks SET status='backlog', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(task.id)
  }
}

// ── Work: Implement ───────────────────────────────────────────────────────────

async function implementTask(task) {
  log('Implementing #' + task.id + ': ' + (task.title || '').substring(0, 50))
  const claimed = db.prepare(
    'UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?'
  ).run('in_progress', task.id, 'approved')
  if (claimed.changes === 0) return

  const topicId = task.tg_topic_id
  if (topicId) await topicMsg(topicId, '⚡ Starting implementation...')

  const sysPrompt = [
    'You are implementing an approved work task. Post progress as you go:',
    '  node /opt/claude-agent/task-api.js progress "what you are doing"',
    'If blocked: node /opt/claude-agent/task-api.js blocked "what you need"',
    'To queue follow-up: node /opt/claude-agent/task-api.js create --title "X" --description "Y"',
  ].join('\n')

  try {
    const { result } = await runClaude(
      task.description + '\n\nApproved plan:\n' + (task.plan || ''),
      { sysPrompt, env: { CURRENT_TASK_ID: String(task.id) } }
    )
    db.prepare("UPDATE tasks SET status='done', result=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(result, task.id)
    if (topicId) { await topicMsg(topicId, '✅ *Done*\n\n' + result.substring(0, 2000), 'Markdown'); await closeTopic(topicId) }
    log('Task #' + task.id + ' done')
  } catch(e) {
    db.prepare("UPDATE tasks SET status='failed', result=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(e.message, task.id)
    if (topicId) await topicMsg(topicId, '❌ Failed: ' + e.message)
    log('Task #' + task.id + ' failed: ' + e.message)
  }
}

// ── Chat task ─────────────────────────────────────────────────────────────────

async function chatTask(task) {
  log('Chat #' + task.id + (task.session_id ? ' [resume]' : '') + ': ' + task.description.substring(0, 60))
  const claimed = db.prepare(
    'UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?'
  ).run('in_progress', task.id, 'inbox')
  if (claimed.changes === 0) return

  const typingInterval = setInterval(() => sendTyping(task.chat_id), 4000)
  try {
    const { result, sessionId } = await runClaude(task.description, { resume: task.session_id || undefined })
    clearInterval(typingInterval)
    db.prepare("UPDATE tasks SET status='done', result=?, session_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(result, sessionId, task.id)
    if (task.thinking_msg_id) await deleteMsg(task.chat_id, task.thinking_msg_id)
    let lastMsgId = null
    for (const chunk of (result.match(/[\s\S]{1,4000}/g) || ['(no response)'])) {
      try { lastMsgId = await sendMsg(task.chat_id, chunk, { parse_mode: 'Markdown' }) }
      catch(e) { lastMsgId = await sendMsg(task.chat_id, chunk) }
    }
    if (lastMsgId && sessionId)
      db.prepare('UPDATE tasks SET tg_message_id=? WHERE id=?').run(String(lastMsgId), task.id)
    log('Chat #' + task.id + ' done')
    reflect(task.description, result).catch(() => {})
  } catch(err) {
    clearInterval(typingInterval)
    db.prepare("UPDATE tasks SET status='failed', result=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(err.message, task.id)
    if (task.thinking_msg_id) await deleteMsg(task.chat_id, task.thinking_msg_id)
    await sendMsg(task.chat_id, 'Sorry, something went wrong: ' + err.message)
    log('Chat #' + task.id + ' failed: ' + err.message)
  }
}

// ── Poll ──────────────────────────────────────────────────────────────────────

function recoverStuck() {
  const cutoff = new Date(Date.now() - PLANNING_TIMEOUT_MS).toISOString()
  const n = db.prepare(
    "UPDATE tasks SET status='backlog', updated_at=CURRENT_TIMESTAMP WHERE type='work' AND status='planning' AND updated_at < ?"
  ).run(cutoff).changes
  if (n > 0) log('Recovered ' + n + ' stuck planning tasks')
}

async function poll() {
  recoverStuck()
  const task = db.prepare(`
    SELECT * FROM tasks WHERE
      (type = 'chat' AND status = 'inbox')
      OR (type IS NULL AND status = 'inbox')
      OR (type = 'work' AND status = 'backlog')
      OR (type = 'work' AND status = 'approved')
      OR (type = 'work' AND status = 'needs_revision')
      OR (type = 'improvement' AND status = 'approved')
      OR (type = 'improvement' AND status = 'backlog')
    ORDER BY priority DESC, created_at ASC LIMIT 1
  `).get()
  if (!task) return
  if (task.type === 'work') {
    if (task.status === 'backlog' || task.status === 'needs_revision') await planTask(task)
    else if (task.status === 'approved') await implementTask(task)
  } else if (task.type === 'improvement') {
    if (task.status === 'approved') await implementTask(task)
    else if (task.status === 'backlog') await planTask(task)
  } else {
    await chatTask(task)
  }
}

log('Worker started')
poll()
setInterval(poll, POLL_INTERVAL)

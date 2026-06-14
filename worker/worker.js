require('dotenv').config({ path: '/opt/claude-agent/.env' })
const { RateLimiter } = require('../lib/rateLimit')
const { getDatabase, withTx } = require('../lib/db')
const { runClaude } = require('../lib/claude-runner')
const { execSync } = require('child_process')
const https = require('https')
const http = require('http')
const path = require('path')
const AsyncLogger = require('../lib/logger')

const POLL_INTERVAL = 10000
const BOT_TOKEN = process.env.BOT_TOKEN
const GROUP_ID = process.env.GROUP_ID
const PLANNING_TIMEOUT_MS = 10 * 60 * 1000
const LOGS_DIR = '/opt/claude-agent/logs'
const WORKER_LOG = path.join(LOGS_DIR, 'worker.log')

const db = getDatabase()
const rateLimiter = new RateLimiter()
const logger = new AsyncLogger(WORKER_LOG)

function log(msg) { logger.log(msg) }

// ── Exponential backoff state ──────────────────────────────────────────────────
const pollState = {
  consecutiveEmpty: 0,
  lastLogTime: Date.now(),
  currentInterval: POLL_INTERVAL,
  pollStartTime: Date.now()
}

// ── Health state ──────────────────────────────────────────────────────────────
const healthState = {
  startTime: Date.now(),
  lastTaskTime: null
}

function calculateBackoffInterval(consecutiveEmpty) {
  if (consecutiveEmpty < 5) return 10000
  if (consecutiveEmpty < 10) return 30000
  return 60000
}

function logBackoffState() {
  const now = Date.now()
  if (now - pollState.lastLogTime < 60000) return
  const uptime = Math.floor((now - pollState.pollStartTime) / 1000)
  const metrics = getMetrics()
  log(`[backoff] uptime=${uptime}s empty=${pollState.consecutiveEmpty} interval=${pollState.currentInterval}ms polls=${metrics.poll_count || 0} found=${metrics.tasks_found_count || 0}`)
  pollState.lastLogTime = now
}

// ── Metrics ───────────────────────────────────────────────────────────────────

function getMetric(key) {
  try {
    const row = db.prepare("SELECT value FROM metrics WHERE key=?").get(key)
    return row ? row.value : 0
  } catch(e) { return 0 }
}

function setMetric(key, value) {
  try {
    db.prepare("INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(key, value)
  } catch(e) { log('setMetric failed: ' + e.message) }
}

function incrementMetric(key, delta = 1) {
  try {
    const current = getMetric(key)
    setMetric(key, current + delta)
  } catch(e) { log('incrementMetric failed: ' + e.message) }
}

function getMetrics() {
  try {
    const rows = db.prepare("SELECT key, value FROM metrics").all()
    const metrics = {}
    rows.forEach(r => metrics[r.key] = r.value)
    return metrics
  } catch(e) { return {} }
}

function getQueueLength() {
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status IN ('inbox', 'backlog', 'approved', 'awaiting_approval')").get()
    return row ? row.count : 0
  } catch(e) { return 0 }
}

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
  const res = await rateLimiter.enqueue(() => tgPost('/sendMessage', Object.assign({ chat_id: chatId, text }, opts || {})), chatId)
  return res && res.result ? res.result.message_id : null
}

async function deleteMsg(chatId, msgId) {
  return rateLimiter.enqueue(() => tgPost('/deleteMessage', { chat_id: chatId, message_id: parseInt(msgId) }), chatId)
}

async function sendTyping(chatId) {
  return rateLimiter.enqueue(() => tgPost('/sendChatAction', { chat_id: chatId, action: 'typing' }), chatId)
}

async function createTopic(name) {
  if (!GROUP_ID) return null
  try {
    const res = await rateLimiter.enqueue(() => tgPost('/createForumTopic', { chat_id: GROUP_ID, name: name.substring(0, 128) }), GROUP_ID)
    if (res && res.result) return res.result.message_thread_id
  } catch(e) { log('createTopic failed: ' + e.message) }
  return null
}

async function closeTopic(topicId) {
  if (!GROUP_ID || !topicId) return
  try { await rateLimiter.enqueue(() => tgPost('/closeForumTopic', { chat_id: GROUP_ID, message_thread_id: topicId }), GROUP_ID) } catch(e) {}
}

async function topicMsg(topicId, text, parseMode) {
  if (!GROUP_ID || !topicId) return
  return sendMsg(GROUP_ID, text, Object.assign({ message_thread_id: topicId }, parseMode ? { parse_mode: parseMode } : {}))
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

  const planStartTime = Date.now()
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
    const planTimeMs = Date.now() - planStartTime

    const title = task.title || task.description.substring(0, 80)
    const topicId = await createTopic('📋 ' + title)
    if (topicId) await topicMsg(topicId, '@Audrius 📋 *Plan ready for review*\n\n' + plan.substring(0, 3500), 'Markdown')

    const preview = plan.substring(0, 700) + (plan.length > 700 ? '...' : '')
    await sendMsg(task.chat_id, '📋 *Plan: ' + title + '*\n\n' + preview, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[
        { text: '✅ Approve', callback_data: 'approve_' + task.id },
        { text: '✏️ Revise',  callback_data: 'reject_'  + task.id }
      ]]}
    })

    withTx(db, () => {
      incrementMetric('tasks_planned')
      incrementMetric('total_plan_time_ms', planTimeMs)
      incrementMetric('plan_count')
      db.prepare(
        'UPDATE tasks SET status=?, plan=?, tg_topic_id=?, rejection_notes=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?'
      ).run('awaiting_approval', plan, topicId, task.id)
    })
    log('Task #' + task.id + ' awaiting approval')
  } catch(e) {
    log('Planning failed #' + task.id + ': ' + e.message)
    withTx(db, () => {
      db.prepare("UPDATE tasks SET status='backlog', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(task.id)
    })
  }
}

// ── Git: Commit changes ───────────────────────────────────────────────────────

function getGitHubUrl() {
  try {
    const cwd = '/opt/claude-agent'
    const remote = execSync('git remote get-url origin', { cwd, encoding: 'utf8' }).trim()
    const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/)
    if (match) return `https://github.com/${match[1]}/${match[2]}`
    return null
  } catch(e) { return null }
}

function commitChanges(taskId, taskTitle, isHighRisk) {
  try {
    const cwd = '/opt/claude-agent'
    const status = execSync('git status --porcelain', { cwd, encoding: 'utf8' }).trim()
    if (!status) return null // No changes

    execSync('git add -A', { cwd })
    const msg = `task: ${taskTitle.substring(0, 50)} (#${taskId})`
    execSync(`git commit -m "${msg}"`, { cwd, env: Object.assign({}, process.env, {GIT_AUTHOR_NAME: 'Agent', GIT_AUTHOR_EMAIL: 'agent@localhost', GIT_COMMITTER_NAME: 'Agent', GIT_COMMITTER_EMAIL: 'agent@localhost'}) })

    const hash = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf8' }).trim()
    const baseUrl = getGitHubUrl()
    const commitUrl = baseUrl ? `${baseUrl}/commit/${hash}` : null
    return { hash, url: commitUrl }
  } catch(e) {
    log('Commit failed: ' + e.message)
    return null
  }
}

// ── Work: Implement ───────────────────────────────────────────────────────────

async function implementTask(task) {
  log('Implementing #' + task.id + ': ' + (task.title || '').substring(0, 50))
  const claimed = db.prepare(
    'UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?'
  ).run('in_progress', task.id, 'approved')
  if (claimed.changes === 0) return

  let topicId = task.tg_topic_id
  // Create topic for auto-executed improvement tasks
  if (!topicId && task.type === 'improvement') {
    const title = task.title || task.description.substring(0, 80)
    topicId = await createTopic('⚡ ' + title)
    if (topicId) withTx(db, () => {
      db.prepare('UPDATE tasks SET tg_topic_id=? WHERE id=?').run(topicId, task.id)
    })
    if (topicId) await topicMsg(topicId, '@Audrius 🤖 *Auto-executing improvement*\n\n' + (task.plan || 'No plan'), 'Markdown')
  }

  if (topicId) await topicMsg(topicId, '@Audrius ⚡ Starting implementation...')

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

    const commit = commitChanges(task.id, task.title || task.description.substring(0, 80), task.significance === 'high')
    const finalResult = commit ? `Commit: ${commit.hash}\nURL: ${commit.url || 'no-github-link'}\n\n${result}` : result

    healthState.lastTaskTime = Date.now()
    withTx(db, () => {
      db.prepare("UPDATE tasks SET status='done', result=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(finalResult, task.id)
      incrementMetric('tasks_completed')
    })
    if (topicId) { await topicMsg(topicId, '@Audrius ✅ *Done*\n\n' + finalResult.substring(0, 2000), 'Markdown'); await closeTopic(topicId) }
    log('Task #' + task.id + ' done')
  } catch(e) {
    healthState.lastTaskTime = Date.now()
    withTx(db, () => {
      db.prepare("UPDATE tasks SET status='failed', result=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(e.message, task.id)
      incrementMetric('tasks_failed')
    })
    if (topicId) await topicMsg(topicId, '@Audrius ❌ Failed: ' + e.message)
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
    if (task.thinking_msg_id) await deleteMsg(task.chat_id, task.thinking_msg_id)
    let lastMsgId = null
    for (const chunk of (result.match(/[\s\S]{1,4000}/g) || ['(no response)'])) {
      try { lastMsgId = await sendMsg(task.chat_id, chunk, { parse_mode: 'Markdown' }) }
      catch(e) { lastMsgId = await sendMsg(task.chat_id, chunk) }
    }
    healthState.lastTaskTime = Date.now()
    withTx(db, () => {
      db.prepare("UPDATE tasks SET status='done', result=?, session_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(result, sessionId, task.id)
      if (lastMsgId && sessionId)
        db.prepare('UPDATE tasks SET tg_message_id=? WHERE id=?').run(String(lastMsgId), task.id)
    })
    log('Chat #' + task.id + ' done')
    reflect(task.description, result).catch(() => {})
  } catch(err) {
    clearInterval(typingInterval)
    healthState.lastTaskTime = Date.now()
    withTx(db, () => {
      db.prepare("UPDATE tasks SET status='failed', result=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(err.message, task.id)
    })
    if (task.thinking_msg_id) await deleteMsg(task.chat_id, task.thinking_msg_id)
    await sendMsg(task.chat_id, 'Sorry, something went wrong: ' + err.message)
    log('Chat #' + task.id + ' failed: ' + err.message)
  }
}

// ── Poll ──────────────────────────────────────────────────────────────────────

function recoverStuck() {
  const cutoff = new Date(Date.now() - PLANNING_TIMEOUT_MS).toISOString()
  // Utilizes idx_tasks_type_status composite index for (type='work', status='planning') filter
  const n = db.prepare(
    "UPDATE tasks SET status='backlog', updated_at=CURRENT_TIMESTAMP WHERE type='work' AND status='planning' AND updated_at < ?"
  ).run(cutoff).changes
  if (n > 0) log('Recovered ' + n + ' stuck planning tasks')
}

async function poll() {
  try {
    recoverStuck()
    // This query benefits from idx_tasks_type_status composite index for efficient filtering
    // on frequent (type, status) combinations used to select the next task to process
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

    incrementMetric('poll_count', 1)

    if (!task) {
      pollState.consecutiveEmpty++
      return
    }

    incrementMetric('tasks_found_count', 1)
    pollState.consecutiveEmpty = 0

    if (task.type === 'work') {
      if (task.status === 'backlog' || task.status === 'needs_revision') await planTask(task)
      else if (task.status === 'approved') await implementTask(task)
    } else if (task.type === 'improvement') {
      if (task.status === 'approved') await implementTask(task)
      else if (task.status === 'backlog') await planTask(task)
    } else {
      await chatTask(task)
    }
  } catch (err) {
    log('ERROR in poll: ' + err.message)
  }
}

// ── Health endpoint ──────────────────────────────────────────────────────────
http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    const now = Date.now()
    const uptime = now - healthState.startTime
    const response = {
      status: 'ok',
      timestamp: new Date(now).toISOString(),
      queue_length: getQueueLength(),
      uptime_ms: uptime,
      last_task_time: healthState.lastTaskTime ? new Date(healthState.lastTaskTime).toISOString() : null
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response, null, 2))
  } else {
    res.writeHead(404)
    res.end()
  }
}).listen(3001, 'localhost', () => {
  log('Health endpoint listening on http://localhost:3001/health')
})

process.on('unhandledRejection', (reason, promise) => {
  log('UNHANDLED REJECTION: ' + (reason?.message || String(reason)))
})

async function pollLoop() {
  await poll()
  logBackoffState()
  const newInterval = calculateBackoffInterval(pollState.consecutiveEmpty)
  if (newInterval !== pollState.currentInterval) {
    pollState.currentInterval = newInterval
    log(`Backoff interval changed to ${newInterval}ms (empty count: ${pollState.consecutiveEmpty})`)
  }
  setTimeout(pollLoop, pollState.currentInterval)
}

log('Worker started')
pollLoop()
setInterval(() => rateLimiter.cleanupOldLimiters(), 3600000) // Clean up old rate limiters every hour

require('dotenv').config({ path: '/opt/claude-agent/.env' })
const { Telegraf } = require('telegraf')
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')
const { validateTitle, validateDescription, validateRejectionNotes } = require('../../lib/validate')

const bot = new Telegraf(process.env.BOT_TOKEN)
const OWNER_ID = parseInt(process.env.OWNER_ID, 10)
const LOGS_DIR = '/opt/claude-agent/logs'
const BOT_LOG = path.join(LOGS_DIR, 'telegram-bot.log')

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })

const db = new Database('/opt/claude-agent/tasks.db')
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
]
for (const m of MIGRATIONS) { try { db.exec(m) } catch(e) {} }

const pendingRejection = {}

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg + '\n'
  console.log(line.trim())
  fs.appendFileSync(BOT_LOG, line)
}

bot.use((ctx, next) => {
  if (ctx.from && ctx.from.id !== OWNER_ID) return
  return next()
})

bot.command('start', (ctx) =>
  ctx.reply('Hey! Send any message to chat, or /work <description> to queue a work task.')
)

bot.command('tasks', (ctx) => {
  const rows = db.prepare(
    "SELECT id, status, type, substr(COALESCE(title,description),1,50) as label FROM tasks ORDER BY created_at DESC LIMIT 10"
  ).all()
  if (!rows.length) return ctx.reply('No tasks yet.')
  ctx.reply(rows.map(t => '#' + t.id + ' [' + t.status + '] [' + (t.type || 'chat') + '] ' + t.label).join('\n'))
})

bot.command('work', async (ctx) => {
  let desc = ctx.message.text.replace(/^\/work\s*/i, '').trim()
  if (!desc) return ctx.reply('Usage: /work <description of what to build or improve>')
  desc = validateDescription(desc)
  const title = validateTitle(desc)
  const res = db.prepare(
    "INSERT INTO tasks (chat_id, description, type, title, status, created_by) VALUES (?, ?, 'work', ?, 'backlog', 'user')"
  ).run(String(ctx.chat.id), desc, title)
  log('WORK #' + res.lastInsertRowid + ': ' + title)
  await ctx.reply('Work task #' + res.lastInsertRowid + ': "' + title + '"\n\nPlan coming shortly.')
})

bot.action(/^approve_(\d+)$/, async (ctx) => {
  const id = parseInt(ctx.match[1])
  const res = db.prepare(
    "UPDATE tasks SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='awaiting_approval'"
  ).run(id)
  if (res.changes === 0) return ctx.answerCbQuery('Already handled.')
  await ctx.answerCbQuery('Approved!')
  try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }) } catch(e) {}
  await ctx.reply('Task #' + id + ' approved.')
  log('Task #' + id + ' approved')
})

bot.action(/^reject_(\d+)$/, async (ctx) => {
  const id = parseInt(ctx.match[1])
  pendingRejection[String(ctx.chat.id)] = id
  await ctx.answerCbQuery('Tell me what to change.')
  try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }) } catch(e) {}
  await ctx.reply('What should be revised for task #' + id + '?')
  log('Task #' + id + ' revision requested')
})

bot.on('text', async (ctx) => {
  const chatId = String(ctx.chat.id)
  const text = ctx.message.text

  if (pendingRejection[chatId]) {
    const taskId = pendingRejection[chatId]
    delete pendingRejection[chatId]
    const validatedNotes = validateRejectionNotes(text)
    db.prepare(
      "UPDATE tasks SET status='needs_revision', rejection_notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).run(validatedNotes, taskId)
    await ctx.reply('Task #' + taskId + ' sent back for revision.')
    log('Task #' + taskId + ' needs_revision')
    return
  }

  let sessionId = null
  if (ctx.message.reply_to_message) {
    const replyMsgId = String(ctx.message.reply_to_message.message_id)
    const parent = db.prepare("SELECT session_id FROM tasks WHERE tg_message_id=? AND session_id IS NOT NULL").get(replyMsgId)
    if (parent) { sessionId = parent.session_id; log('Resuming ' + replyMsgId) }
  }

  const thinking = await ctx.reply('Thinking...')
  const validatedText = validateDescription(text)
  const res = db.prepare(
    'INSERT INTO tasks (chat_id, description, session_id, thinking_msg_id) VALUES (?, ?, ?, ?)'
  ).run(chatId, validatedText, sessionId, String(thinking.message_id))
  log('QUEUED #' + res.lastInsertRowid + ': ' + validatedText.substring(0, 50))
})

bot.catch((err) => log('BOT ERROR: ' + err.message))
bot.launch()
log('Bot started')
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

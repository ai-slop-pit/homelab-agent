require('dotenv').config({ path: '/opt/claude-agent/.env' })
const { Telegraf } = require('telegraf')
const fs = require('fs')
const path = require('path')
const AsyncLogger = require('../../lib/logger')
const { getDatabase } = require('../../lib/db')

const bot = new Telegraf(process.env.BOT_TOKEN)
const OWNER_ID = parseInt(process.env.OWNER_ID, 10)
const LOGS_DIR = '/opt/claude-agent/logs'
const BOT_LOG = path.join(LOGS_DIR, 'telegram-bot.log')

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })

const logger = new AsyncLogger(BOT_LOG)

const db = getDatabase()

const pendingRejection = {}

function log(msg) {
  logger.log(msg)
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
  const desc = ctx.message.text.replace(/^\/work\s*/i, '').trim()
  if (!desc) return ctx.reply('Usage: /work <description of what to build or improve>')
  if (desc.length > 5000) return ctx.reply('Description must be 1-5000 characters')
  const sanitized = desc.trim().replace(/[\r\n]{3,}/g, '\n\n')
  const title = sanitized.substring(0, 100)
  const res = db.prepare(
    "INSERT INTO tasks (chat_id, description, type, title, status, created_by) VALUES (?, ?, 'work', ?, 'backlog', 'user')"
  ).run(String(ctx.chat.id), sanitized, title)
  log('WORK #' + res.lastInsertRowid + ': ' + title)
  await ctx.reply('Work task #' + res.lastInsertRowid + ': "' + title + '"\n\nPlan coming shortly.')
})

bot.action(/^approve_(\d+)$/, async (ctx) => {
  try {
    const id = parseInt(ctx.match[1])
    const res = db.prepare(
      "UPDATE tasks SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='awaiting_approval'"
    ).run(id)
    if (res.changes === 0) return ctx.answerCbQuery('Already handled.')
    await ctx.answerCbQuery('Approved!')
    try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }) } catch(e) {}
    await ctx.reply('Task #' + id + ' approved.')
    log('Task #' + id + ' approved')
  } catch (err) {
    log('ERROR in approve handler: ' + err.message)
    try { await ctx.reply('Failed to update. Retry manually.') } catch(e) {}
  }
})

bot.action(/^reject_(\d+)$/, async (ctx) => {
  try {
    const id = parseInt(ctx.match[1])
    pendingRejection[String(ctx.chat.id)] = id
    await ctx.answerCbQuery('Tell me what to change.')
    try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }) } catch(e) {}
    await ctx.reply('What should be revised for task #' + id + '?')
    log('Task #' + id + ' revision requested')
  } catch (err) {
    log('ERROR in reject handler: ' + err.message)
    try { await ctx.reply('Failed to update. Retry manually.') } catch(e) {}
  }
})

bot.on('text', async (ctx) => {
  try {
    const chatId = String(ctx.chat.id)
    const text = ctx.message.text

    if (pendingRejection[chatId]) {
      const taskId = pendingRejection[chatId]
      delete pendingRejection[chatId]
      if (!text || text.length > 5000) return ctx.reply('Revision notes must be 1-5000 characters')
      const sanitized = text.trim().replace(/[\r\n]{3,}/g, '\n\n')
      db.prepare(
        "UPDATE tasks SET status='needs_revision', rejection_notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).run(sanitized, taskId)
      await ctx.reply('Task #' + taskId + ' sent back for revision.')
      log('Task #' + taskId + ' needs_revision')
      return
    }

    if (!text || text.length > 5000) return ctx.reply('Message must be 1-5000 characters')
    const sanitized = text.trim().replace(/[\r\n]{3,}/g, '\n\n')

    let sessionId = null
    if (ctx.message.reply_to_message) {
      const replyMsgId = String(ctx.message.reply_to_message.message_id)
      const parent = db.prepare("SELECT session_id FROM tasks WHERE tg_message_id=? AND session_id IS NOT NULL").get(replyMsgId)
      if (parent) { sessionId = parent.session_id; log('Resuming ' + replyMsgId) }
    }

    const thinking = await ctx.reply('Thinking...')
    const res = db.prepare(
      'INSERT INTO tasks (chat_id, description, session_id, thinking_msg_id) VALUES (?, ?, ?, ?)'
    ).run(chatId, sanitized, sessionId, String(thinking.message_id))
    log('QUEUED #' + res.lastInsertRowid + ': ' + sanitized.substring(0, 50))
  } catch (err) {
    log('ERROR in text handler: ' + err.message)
    try { await ctx.reply('Failed to process message. Retry manually.') } catch(e) {}
  }
})

bot.catch((err) => log('BOT ERROR: ' + err.message))

process.on('unhandledRejection', (reason, promise) => {
  log('UNHANDLED REJECTION: ' + (reason?.message || String(reason)))
})

bot.launch()
log('Bot started')
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

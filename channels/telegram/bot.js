require('dotenv').config({ path: '/opt/claude-agent/.env' })
const { Telegraf } = require('telegraf')
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

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
try { db.exec('ALTER TABLE tasks ADD COLUMN session_id TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN tg_message_id TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN thinking_msg_id TEXT'); } catch(e) {}

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg + '\n'
  console.log(line.trim())
  fs.appendFileSync(BOT_LOG, line)
}

bot.use((ctx, next) => {
  if (ctx.from && ctx.from.id !== OWNER_ID) return
  return next()
})

bot.command('start', (ctx) => ctx.reply('Hey! What can I do for you?'))
bot.command('tasks', (ctx) => {
  const tasks = db.prepare("SELECT id, status, substr(description,1,50) as desc FROM tasks ORDER BY created_at DESC LIMIT 10").all()
  if (!tasks.length) return ctx.reply('No tasks yet.')
  ctx.reply(tasks.map(t => '#' + t.id + ' [' + t.status + '] ' + t.desc).join('\n'))
})

bot.on('text', async (ctx) => {
  const desc = ctx.message.text
  const chatId = ctx.chat.id.toString()

  let sessionId = null
  if (ctx.message.reply_to_message) {
    const replyMsgId = ctx.message.reply_to_message.message_id.toString()
    const parent = db.prepare("SELECT session_id FROM tasks WHERE tg_message_id=? AND session_id IS NOT NULL").get(replyMsgId)
    if (parent) {
      sessionId = parent.session_id
      log('Resuming session from msg ' + replyMsgId)
    }
  }

  const thinking = await ctx.reply('Thinking...')
  const thinkingMsgId = thinking.message_id.toString()

  const res = db.prepare('INSERT INTO tasks (chat_id, description, session_id, thinking_msg_id) VALUES (?, ?, ?, ?)').run(chatId, desc, sessionId, thinkingMsgId)
  log('QUEUED #' + res.lastInsertRowid + ': ' + desc.substring(0, 50))
})

bot.catch((err) => log('ERROR: ' + err.message))
bot.launch()
log('Bot started')
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

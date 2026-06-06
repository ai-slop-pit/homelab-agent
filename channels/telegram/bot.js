require('dotenv').config({ path: '/opt/claude-agent/.env' })
const { Telegraf } = require('telegraf')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const bot = new Telegraf(process.env.BOT_TOKEN)
const OWNER_ID = parseInt(process.env.OWNER_ID, 10)

const LOGS_DIR = '/opt/claude-agent/logs'
const BOT_LOG = path.join(LOGS_DIR, 'telegram-bot.log')

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

function log(message) {
  const timestamp = new Date().toISOString()
  const logMessage = '[' + timestamp + '] ' + message + '\n'
  console.log(logMessage.trim())
  fs.appendFileSync(BOT_LOG, logMessage)
}

bot.use((ctx, next) => {
  if (ctx.from && ctx.from.id !== OWNER_ID) {
    log('BLOCKED: Unauthorized user ' + ctx.from.id)
    return ctx.reply('Unauthorized.')
  }
  return next()
})

bot.command('start', (ctx) => {
  log('START: User ' + ctx.from.id)
  ctx.reply('Agent online. Send me a task.')
})

bot.command('status', (ctx) => {
  ctx.reply('Agent running. Ready for tasks.')
})

bot.on('text', async (ctx) => {
  const userMessage = ctx.message.text
  log('TASK: ' + userMessage)

  try {
    await ctx.sendChatAction('typing')
    await ctx.reply('Working on it...')

    const claude = spawn('claude', ['-p', userMessage, '--output-format', 'text'], {
      cwd: '/opt/claude-agent',
      timeout: 600000,
      env: Object.assign({}, process.env, { HOME: '/root' }),
    })

    let response = ''
    let errorOut = ''

    claude.stdout.on('data', (data) => { response += data.toString(); })
    claude.stderr.on('data', (data) => { errorOut += data.toString(); })

    await new Promise((resolve, reject) => {
      claude.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error('Claude exited with code ' + code + ': ' + errorOut))
      })
      claude.on('error', reject)
    })

    const maxLength = 4096
    const text = response.trim() || '(no response)'
    if (text.length > maxLength) {
      const chunks = text.match(/.{1,4096}/g) || []
      for (const chunk of chunks) await ctx.reply(chunk)
    } else {
      await ctx.reply(text)
    }

    log('DONE: ' + text.length + ' chars sent')

  } catch (err) {
    log('ERROR: ' + err.message)
    await ctx.reply('Error: ' + err.message).catch(() => {})
  }
})

bot.catch((err) => {
  log('TELEGRAM ERROR: ' + err.message)
})

bot.launch()
log('Bot started')

process.once('SIGINT', () => { bot.stop('SIGINT'); })
process.once('SIGTERM', () => { bot.stop('SIGTERM'); })

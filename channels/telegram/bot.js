const { Telegraf } = require('telegraf');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);

const LOGS_DIR = '/opt/claude-agent/logs';
const BOT_LOG = path.join(LOGS_DIR, 'telegram-bot.log');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  fs.appendFileSync(BOT_LOG, logMessage, { flag: 'a' });
}

// Handle /start command
bot.command('start', (ctx) => {
  log(`START: User ${ctx.from.id} (${ctx.from.first_name})`);
  ctx.reply('Hello! Send me a message and I\'ll process it.');
});

// Handle all text messages
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const userName = ctx.from.first_name;
  const userMessage = ctx.message.text;

  log(`MESSAGE: User ${userId} (${userName}): ${userMessage}`);

  try {
    // Show typing indicator
    await ctx.sendChatAction('typing');

    // Spawn Claude Code process with the user's message
    const claude = spawn('claude', ['--message', userMessage], {
      cwd: '/opt/claude-agent',
      timeout: 120000, // 2 minute timeout
    });

    let response = '';
    let error = '';

    claude.stdout.on('data', (data) => {
      response += data.toString();
    });

    claude.stderr.on('data', (data) => {
      error += data.toString();
    });

    await new Promise((resolve, reject) => {
      claude.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Claude process exited with code ${code}`));
        }
      });

      claude.on('error', reject);
    });

    if (error) {
      log(`ERROR: ${error}`);
    }

    // Send response (split if too long for Telegram's limit)
    const maxLength = 4096;
    if (response.length > maxLength) {
      const chunks = response.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(response || '(no response)');
    }

    log(`RESPONSE: Sent ${response.length} chars to user ${userId}`);

  } catch (err) {
    log(`ERROR handling message: ${err.message}`);
    await ctx.reply(`Error: ${err.message}`).catch(() => {});
  }
});

// Error handler
bot.catch((err, ctx) => {
  log(`TELEGRAM ERROR: ${err.message}`);
  console.error(err);
});

// Start the bot
bot.launch({
  polling: {
    interval: 300,
    timeout: 20,
  },
});

log('Bot started and listening for messages');

// Graceful shutdown
process.once('SIGINT', () => {
  log('SIGINT received, shutting down');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  log('SIGTERM received, shutting down');
  bot.stop('SIGTERM');
});

module.exports = bot;

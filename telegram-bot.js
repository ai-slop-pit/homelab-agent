const { Telegraf } = require('telegraf');
const { spawnSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
const GROUP_ID = parseInt(process.env.GROUP_ID || '0');
const OWNER_ID = parseInt(process.env.OWNER_ID || process.env.CHAT_ID || '0');
const WIFE_ID  = parseInt(process.env.WIFE_ID  || '0');
const THREADS_DIR = '/opt/claude-agent/threads';

fs.mkdirSync(THREADS_DIR, { recursive: true });

function getThreadDir(threadId) {
  const dir = path.join(THREADS_DIR, String(threadId || '0'));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function isOwner(userId) { return userId === OWNER_ID; }
function isAllowed(userId) { return userId === OWNER_ID || userId === WIFE_ID; }

const SAFE_PREFIX = 'You are a helpful home assistant. Answer questions about Plex, media, schedules, and general home info only. Do NOT run system commands, modify files, SSH anywhere, or perform destructive actions. Be friendly and concise.\n\nQuestion: ';

// Debug command — no auth required, works anywhere
bot.command('chatid', (ctx) => {
  ctx.reply('Chat ID: ' + ctx.chat.id + '\nYour user ID: ' + ctx.from.id + '\nThread ID: ' + (ctx.message.message_thread_id || 'none'));
});

// Security middleware
bot.use((ctx, next) => {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (chatId === GROUP_ID && isAllowed(userId)) return next();
  if (chatId === userId && isOwner(userId)) return next();
});

bot.command('status', (ctx) => {
  ctx.reply('CT 112 online | Claude Code v2.1.150 | Bot active');
});

bot.command('setup', async (ctx) => {
  if (!isOwner(ctx.from?.id)) return ctx.reply('Owner only.');
  await ctx.reply('Setting up group topics...');
  const topics = ['homelab', 'general', 'media', 'dev'];
  const created = [];
  for (const name of topics) {
    try {
      await bot.telegram.callApi('createForumTopic', { chat_id: GROUP_ID, name });
      created.push(name);
    } catch(e) { created.push(name + ' (exists)'); }
  }
  await ctx.reply('Topics: ' + created.join(', '));
});

bot.command('new', async (ctx) => {
  const threadId = ctx.message?.message_thread_id || '0';
  fs.rmSync(path.join(getThreadDir(threadId), '.claude'), { recursive: true, force: true });
  ctx.reply('Fresh session started.');
});

bot.on('text', async (ctx) => {
  const task = ctx.message.text;
  if (task.startsWith('/')) return;
  const userId = ctx.from.id;
  const threadId = ctx.message?.message_thread_id || '0';
  const threadDir = getThreadDir(threadId);
  const prompt = isOwner(userId) ? task : SAFE_PREFIX + task;

  await ctx.reply('⏳ Working...');
  const result = spawnSync('claude', ['-p', prompt, '--continue', '--model', 'claude-haiku-4-5-20251001'], {
    cwd: threadDir,
    env: { ...process.env, HOME: '/home/claude' },
    timeout: 300000, encoding: 'utf8', maxBuffer: 1024 * 1024 * 10
  });
  const output = (result.stdout || result.stderr || 'No output').trim();
  for (const chunk of (output.match(/.{1,4000}/gs) || [output])) {
    await ctx.reply(chunk);
  }
});

const app = express();
app.use(express.json());

app.post('/task', async (req, res) => {
  const { task, threadId = '0' } = req.body;
  if (!task) return res.status(400).json({ error: 'task required' });
  const threadDir = getThreadDir(threadId);
  const result = spawnSync('claude', ['-p', task, '--continue', '--model', 'claude-haiku-4-5-20251001'], {
    cwd: threadDir,
    env: { ...process.env, HOME: '/home/claude' },
    timeout: 300000, encoding: 'utf8', maxBuffer: 1024 * 1024 * 10
  });
  if (GROUP_ID) bot.telegram.sendMessage(GROUP_ID, `n8n: ${task}\n${(result.stdout||'').slice(0,500)}`).catch(()=>{});
  res.json({ output: result.stdout, error: result.stderr });
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('HTTP on :3000'));

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

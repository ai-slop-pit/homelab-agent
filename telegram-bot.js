const { Telegraf } = require('telegraf');
const { spawnSync } = require('child_process');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ALLOWED_CHAT_ID = parseInt(process.env.CHAT_ID);

bot.use((ctx, next) => {
  if (ctx.chat?.id !== ALLOWED_CHAT_ID) return;
  return next();
});

bot.command('status', (ctx) => {
  ctx.reply('CT 112 online | Claude Code v2.1.150 | Bot active');
});

bot.on('text', async (ctx) => {
  const task = ctx.message.text;
  if (task.startsWith('/')) return;

  await ctx.reply(`⏳ Working on: "${task}"`);

  const result = spawnSync('claude', ['-p', task, '--dangerously-skip-permissions'], {
    cwd: '/opt/claude-agent',
    env: { ...process.env, HOME: '/home/claude' },
    timeout: 300000,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10
  });

  const output = (result.stdout || result.stderr || 'No output').trim();
  const chunks = output.match(/.{1,4000}/gs) || [output];
  for (const chunk of chunks) {
    await ctx.reply(chunk);
  }
});

const app = express();
app.use(express.json());

app.post('/task', async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: 'task required' });

  const result = spawnSync('claude', ['-p', task, '--dangerously-skip-permissions'], {
    cwd: '/opt/claude-agent',
    env: { ...process.env, HOME: '/home/claude' },
    timeout: 300000,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10
  });

  bot.telegram.sendMessage(ALLOWED_CHAT_ID, `n8n task done: "${task}"\n${(result.stdout || '').slice(0, 500)}`).catch(() => {});
  res.json({ output: result.stdout, error: result.stderr });
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('HTTP listening on :3000'));

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

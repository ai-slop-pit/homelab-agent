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
const AGENT_STATE = '/opt/claude-agent/.claude/agent-state.json';

fs.mkdirSync(THREADS_DIR, { recursive: true });

// ===== Agent State Utils =====
function getAgentState() {
  try {
    return JSON.parse(fs.readFileSync(AGENT_STATE, 'utf8'));
  } catch {
    return { pending_tasks: [], completed_tasks: [] };
  }
}

function writeAgentState(state) {
  fs.writeFileSync(AGENT_STATE, JSON.stringify(state, null, 2));
}

function addTaskToQueue(source, sourceUser, taskType, taskDesc, skill, approvalRequired = true, priority = 'normal', notifyChannels = []) {
  const state = getAgentState();
  const taskId = require('crypto').randomUUID();
  const now = new Date().toISOString();

  const newTask = {
    id: taskId,
    source,
    source_user: sourceUser,
    task_type: taskType,
    task: taskDesc,
    priority,
    status: 'pending',
    created_at: now,
    updated_at: now,
    skill,
    approval_required: approvalRequired,
    approved_by: null,
    approved_at: null,
    result: null,
    error: null,
    retry_count: 0,
    notify_on_complete: true,
    notify_channels: notifyChannels,
    metadata: { thread_id: '0' }
  };

  if (!state.pending_tasks) state.pending_tasks = [];
  state.pending_tasks.push(newTask);
  state.updated_at = now;
  writeAgentState(state);

  return taskId;
}

function getCompletedTask(taskId) {
  const state = getAgentState();
  return (state.completed_tasks || []).find(t => t.id === taskId);
}

// ===== Security & Helpers =====
function getThreadDir(threadId) {
  const dir = path.join(THREADS_DIR, String(threadId || '0'));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function isOwner(userId) { return userId === OWNER_ID; }
function isAllowed(userId) { return userId === OWNER_ID || userId === WIFE_ID; }

function isDestructiveTask(task) {
  const destructiveKeywords = ['delete', 'drop', 'destroy', 'rm ', 'kill', 'power off', 'reset', 'format'];
  return destructiveKeywords.some(kw => task.toLowerCase().includes(kw));
}

const SAFE_PREFIX = 'You are a helpful home assistant. Answer questions about home status, reminders, schedules, and media. Do NOT run system commands, modify files, SSH anywhere, or perform destructive actions. Be friendly and concise.\n\nQuestion: ';

// ===== Bot Commands =====

// Debug command — no auth required
bot.command('chatid', (ctx) => {
  ctx.reply('Chat ID: ' + ctx.chat.id + '\nUser ID: ' + ctx.from.id + '\nThread ID: ' + (ctx.message.message_thread_id || 'none'));
});

// Security middleware
bot.use((ctx, next) => {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  if (chatId === GROUP_ID && isAllowed(userId)) return next();
  if (chatId === userId && isOwner(userId)) return next();
});

bot.command('status', (ctx) => {
  const state = getAgentState();
  const pending = (state.pending_tasks || []).length;
  ctx.reply(`CT 112 online | ${pending} pending tasks | Agent: ${state.agent_state || 'unknown'}`);
});

bot.command('tasks', (ctx) => {
  const state = getAgentState();
  const pending = (state.pending_tasks || []).length;
  if (pending === 0) return ctx.reply('No pending tasks.');
  const list = (state.pending_tasks || []).slice(-5).map((t, i) => `${i+1}. [${t.status}] ${t.task.slice(0,40)}`).join('\n');
  ctx.reply(`📋 Latest tasks:\n${list}`);
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

// ===== Text Messages: Add to Task Queue =====
bot.on('text', async (ctx) => {
  const task = ctx.message.text;
  if (task.startsWith('/')) return;

  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'unknown';
  const isDestructive = isDestructiveTask(task);

  // For non-owner users, require approval for any task
  // For owner, require approval only for destructive tasks
  const requiresApproval = isDestructive || !isOwner(userId);

  const taskId = addTaskToQueue(
    'telegram',
    userName,
    'query',
    task,
    'research',
    requiresApproval,
    isOwner(userId) ? 'high' : 'normal',
    ['telegram']
  );

  if (requiresApproval) {
    ctx.reply(`📝 Task queued (ID: ${taskId.slice(0, 8)})\n${isDestructive ? '⚠️ Destructive' : '👤 Non-owner'} operation — requires approval`);
  } else {
    ctx.reply(`✅ Task queued for execution (ID: ${taskId.slice(0, 8)})`);
  }
});

// ===== HTTP Endpoints =====
const app = express();
app.use(express.json());

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Submit task via HTTP (from n8n)
app.post('/task', async (req, res) => {
  const { task, taskType = 'automation', skill = 'n8n-orchestrator' } = req.body;

  if (!task) return res.status(400).json({ error: 'task required' });

  try {
    const taskId = addTaskToQueue(
      'n8n',
      'system',
      taskType,
      task,
      skill,
      false, // n8n tasks don't require approval
      'high',
      [] // No Telegram notification
    );

    res.json({ taskId, status: 'queued' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Query task status via HTTP
app.get('/task/:taskId', (req, res) => {
  const state = getAgentState();
  const allTasks = [...(state.pending_tasks || []), ...(state.completed_tasks || [])];
  const task = allTasks.find(t => t.id === req.params.taskId);

  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// Get all pending tasks
app.get('/tasks/pending', (req, res) => {
  const state = getAgentState();
  res.json(state.pending_tasks || []);
});

// Get agent status
app.get('/status', (req, res) => {
  const state = getAgentState();
  res.json({
    agent_state: state.agent_state || 'unknown',
    pending_tasks: (state.pending_tasks || []).length,
    last_sync: state.updated_at || 'never'
  });
});

app.listen(3000, () => console.log('HTTP on :3000'));

// ===== Bot Launch =====
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

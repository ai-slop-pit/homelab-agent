const { Telegraf } = require('telegraf');
const { spawnSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');
const propose = require('/opt/claude-agent/agent-propose');
const { batcher, handleBatchApproval, checkAndSendBatch } = require('/opt/claude-agent/telegram-batch-handler');
const { SkillCreator } = require('/opt/claude-agent/skill-creator');

const bot = new Telegraf(process.env.BOT_TOKEN);
const BOT_DIR = path.dirname(path.dirname(__filename)); // /opt/claude-agent/telegram-bot
const THREADS_DIR = '/opt/claude-agent/threads';
const AGENT_STATE = '/opt/claude-agent/.claude/agent-state.json';
const CONFIG_FILE = path.join(BOT_DIR, 'config', 'groups.json');
const SESSION_FILE = path.join(BOT_DIR, 'sessions', 'current-session.json');

// ===== Session Management =====
function loadSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = fs.readFileSync(SESSION_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.log('[SESSION] Load error:', err.message);
  }
  return null;
}

function saveSession(session) {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
    return true;
  } catch (err) {
    console.error('[SESSION] Save error:', err.message);
    return false;
  }
}

function createNewSession() {
  return {
    session_id: `sess-${Date.now()}`,
    created_at: new Date().toISOString(),
    messages: []
  };
}

function addMessageToSession(session, role, content) {
  session.messages.push({
    role,
    content,
    timestamp: new Date().toISOString()
  });
  return session;
}

// Load configuration
let CONFIG = {
  groups: [],
  users: {},
  settings: { defaultApprovalRequired: false, logLevel: 'info' }
};

function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    CONFIG = JSON.parse(data);
    console.log(`[CONFIG] Loaded ${CONFIG.groups.length} groups`);
    return true;
  } catch (err) {
    console.error('[CONFIG] Failed to load:', err.message);
    return false;
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG, null, 2));
    return true;
  } catch (err) {
    console.error('[CONFIG] Failed to save:', err.message);
    return false;
  }
}

// Load config at startup
loadConfig();

// Fallback to .env for legacy compatibility
const GROUP_ID = parseInt(process.env.GROUP_ID || '0');
const OWNER_ID = parseInt(process.env.OWNER_ID || process.env.CHAT_ID || '0');
const WIFE_ID = parseInt(process.env.WIFE_ID || OWNER_ID);

if (GROUP_ID && OWNER_ID) {
  console.log(`[CONFIG] Fallback: GROUP_ID=${GROUP_ID}, OWNER_ID=${OWNER_ID}`);
}

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

function addTaskToQueue(source, sourceUser, taskType, taskDesc, skill, approvalRequired = true, priority = 'normal', notifyChannels = [], conversationHistory = null) {
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
    metadata: {
      thread_id: '0',
      conversation_history: conversationHistory
    }
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

function isOwner(userId) {
  // Check config first
  for (const group of CONFIG.groups) {
    if (group.owners.includes(userId)) return true;
  }
  // Fallback to env
  return userId === OWNER_ID;
}

function isApprover(userId) {
  for (const group of CONFIG.groups) {
    if (group.approvers?.includes(userId)) return true;
  }
  return userId === OWNER_ID || userId === WIFE_ID;
}

function isAllowed(userId) {
  return isOwner(userId) || isApprover(userId);
}

function isGroupActive(groupId) {
  const group = CONFIG.groups.find(g => g.id === groupId);
  return group?.active !== false;
}

function isDestructiveTask(task) {
  const destructiveKeywords = ['delete', 'drop', 'destroy', 'rm ', 'kill', 'power off', 'reset', 'format'];
  return destructiveKeywords.some(kw => task.toLowerCase().includes(kw));
}

// ===== Direct Claude Integration =====
function callClaude(userMessage, conversationHistory = []) {
  try {
    const { spawnSync } = require('child_process');

    // Build prompt with conversation context
    let prompt = '';
    if (conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
      }
    }
    prompt += userMessage;

    // Call Claude from main agent directory (inherits CLAUDE.md context)
    const result = spawnSync('claude', ['-p', prompt], {
      cwd: '/opt/claude-agent',
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (result.error) {
      console.error('[CLAUDE] Error:', result.error.message);
      return null;
    }

    const output = result.stdout?.trim();
    if (!output) {
      console.error('[CLAUDE] Empty response');
      return null;
    }

    return output;
  } catch (err) {
    console.error('[CLAUDE] Exception:', err.message);
    return null;
  }
}

const SAFE_PREFIX = 'You are a helpful home assistant. Answer questions about home status, reminders, schedules, and media. Do NOT run system commands, modify files, SSH anywhere, or perform destructive actions. Be friendly and concise.\n\nQuestion: ';

// ===== Approval Handling =====
function parseApprovalRequest(response) {
  // Check if response indicates a command needs approval
  if (!response.includes('needs your approval') && !response.includes('needs approval')) {
    return { needsApproval: false };
  }

  // Extract command from backticks
  const cmdMatch = response.match(/`([^`]+)`/);
  if (cmdMatch) {
    return {
      needsApproval: true,
      command: cmdMatch[1],
      message: response
    };
  }

  return { needsApproval: false };
}

async function sendApprovalRequest(ctx, command, message) {
  const markup = {
    inline_keyboard: [
      [
        { text: '✅ Approve', callback_data: `approve:${Buffer.from(command).toString('base64')}` },
        { text: '❌ Reject', callback_data: 'reject' }
      ]
    ]
  };

  return ctx.reply(
    `⚠️ Command needs approval:\n\n\`${command}\`\n\nAllow this?`,
    { reply_markup: markup }
  );
}

function executeCommand(command) {
  try {
    console.log(`[EXEC] Running: ${command}`);
    const result = spawnSync('bash', ['-c', command], {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (result.error) {
      console.error('[EXEC] Error:', result.error.message);
      return { success: false, error: result.error.message };
    }

    return {
      success: true,
      output: result.stdout || result.stderr,
      code: result.status
    };
  } catch (err) {
    console.error('[EXEC] Exception:', err.message);
    return { success: false, error: err.message };
  }
}

// ===== Global error handler =====
bot.catch((err, ctx) => {
  console.error(`[ERROR] Handler error:`, err);
  try {
    ctx.reply('❌ Error processing message').catch(e => console.error('[ERROR] Reply failed:', e));
  } catch (e) {
    console.error('[ERROR] Exception in error handler:', e);
  }
});

// ===== Catch-all logger (before anything else) =====
bot.use((ctx, next) => {
  console.log(`[RECV] Type: ${ctx.updateType}, From: ${ctx.from?.id} (${ctx.from?.first_name}), Chat: ${ctx.chat?.id}, Text: ${ctx.message?.text?.slice(0, 60)}`);
  return next().catch(err => {
    console.error('[ERROR] Middleware error:', err);
    throw err;
  });
});

// ===== Bot Commands =====

// Debug command — no auth required (special override)
bot.command('chatid', (ctx) => {
  console.log('[CMD] /chatid executed');
  ctx.reply('Chat ID: ' + ctx.chat.id + '\nUser ID: ' + ctx.from.id + '\nThread ID: ' + (ctx.message.message_thread_id || 'none'));
});

// Security middleware
bot.use((ctx, next) => {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;
  console.log(`[AUTH] ChatID: ${chatId}, UserID: ${userId}, GROUP_ID: ${GROUP_ID}, OWNER_ID: ${OWNER_ID}`);
  // Allow if in group and user is authorized
  if (chatId === GROUP_ID && isAllowed(userId)) {
    console.log('[AUTH] ✅ Allowed: group + authorized');
    return next();
  }
  // Allow if direct message to owner
  if (chatId === userId && isOwner(userId)) {
    console.log('[AUTH] ✅ Allowed: direct message to owner');
    return next();
  }
  // For /chatid command, always allow (debug info)
  if (ctx.message?.text?.startsWith('/chatid')) {
    console.log('[AUTH] ✅ Allowed: /chatid command');
    return next();
  }
  // Otherwise block silently
  console.log('[AUTH] ❌ Blocked: no authorization');
  return;
});

bot.command('status', (ctx) => {
  const state = getAgentState();
  const pending = (state.pending_tasks || []).length;
  const queued = batcher.queue.proposals.length;
  ctx.reply(`CT 112 online | ${pending} pending tasks | ${queued} proposals queued | Agent: ${state.agent_state || 'unknown'}`);
});

bot.command('batch', async (ctx) => {
  if (!isOwner(ctx.from?.id)) return ctx.reply('Owner only.');

  const stats = batcher.summary();
  const message = `📦 **Proposal Batch Status**\n\n` +
    `Queued: ${stats.queued_proposals} proposals\n` +
    `Age: ${stats.window_age_minutes} minutes\n` +
    `Ready to send: ${stats.ready_to_flush ? '✅ Yes' : '⏸️ Not yet'}\n` +
    `Next flush: ${stats.next_flush_at}\n\n` +
    `By type: ${JSON.stringify(Object.entries(stats.by_type).map(([k, v]) => `${k}=${v.length}`).join(', '))}`;

  ctx.reply(message);
});

bot.command('flushbatch', async (ctx) => {
  if (!isOwner(ctx.from?.id)) return ctx.reply('Owner only.');

  const batch = await checkAndSendBatch(bot, GROUP_ID);
  if (batch) {
    ctx.reply(`✅ Batch flushed! ${batch.proposal_count} proposals sent.`);
  } else {
    ctx.reply('No batch to send.');
  }
});

bot.command('tasks', (ctx) => {
  const state = getAgentState();
  const pending = (state.pending_tasks || []).length;
  if (pending === 0) return ctx.reply('No pending tasks.');
  const list = (state.pending_tasks || []).slice(-5).map((t, i) => `${i+1}. [${t.status}] ${t.task.slice(0,40)}`).join('\n');
  ctx.reply(`📋 Latest tasks:\n${list}`);
});

// ===== Config Management Commands =====
bot.command('addgroup', async (ctx) => {
  if (!isOwner(ctx.from?.id)) return ctx.reply('Owner only.');

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 2) return ctx.reply('Usage: /addgroup <id> <name>');

  const groupId = parseInt(args[0]);
  const groupName = args.slice(1).join(' ');

  const existing = CONFIG.groups.find(g => g.id === groupId);
  if (existing) return ctx.reply(`Group ${groupId} already exists.`);

  CONFIG.groups.push({
    id: groupId,
    name: groupName,
    owners: [ctx.from.id],
    approvers: [ctx.from.id],
    type: 'group',
    active: true
  });

  if (saveConfig()) {
    ctx.reply(`✅ Added group: ${groupName} (ID: ${groupId})`);
  } else {
    ctx.reply('❌ Failed to save config');
  }
});

bot.command('listgroups', async (ctx) => {
  if (CONFIG.groups.length === 0) return ctx.reply('No groups configured.');

  let msg = '📋 **Configured Groups:**\n\n';
  for (const group of CONFIG.groups) {
    msg += `🔸 ${group.name} (${group.id})\n`;
    msg += `   Owners: ${group.owners.join(', ')}\n`;
    msg += `   Status: ${group.active ? '✅ Active' : '❌ Inactive'}\n\n`;
  }
  ctx.reply(msg);
});

bot.command('setowner', async (ctx) => {
  if (!isOwner(ctx.from?.id)) return ctx.reply('Owner only.');

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 2) return ctx.reply('Usage: /setowner <group_id> <user_id>');

  const groupId = parseInt(args[0]);
  const userId = parseInt(args[1]);

  const group = CONFIG.groups.find(g => g.id === groupId);
  if (!group) return ctx.reply(`Group ${groupId} not found.`);

  if (!group.owners.includes(userId)) {
    group.owners.push(userId);
  }

  if (saveConfig()) {
    ctx.reply(`✅ User ${userId} is now owner of ${group.name}`);
  } else {
    ctx.reply('❌ Failed to save config');
  }
});

// ===== Session Commands =====
bot.command('reset', (ctx) => {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
    ctx.reply('💬 Conversation reset. Starting fresh!');
    console.log('[SESSION] Reset by user');
  } catch (err) {
    ctx.reply('❌ Failed to reset conversation');
    console.error('[SESSION] Reset error:', err.message);
  }
});

bot.command('show', (ctx) => {
  const session = loadSession();
  if (!session || session.messages.length === 0) {
    return ctx.reply('No conversation yet. Send a message to start!');
  }

  const recent = session.messages.slice(-10);
  let msg = `📖 **Conversation** (${session.messages.length} messages)\n\n`;

  for (const m of recent) {
    const speaker = m.role === 'user' ? '👤 You' : '🤖 Bot';
    const content = m.content.length > 100 ? m.content.slice(0, 100) + '...' : m.content;
    msg += `${speaker}: ${content}\n`;
  }

  ctx.reply(msg);
  console.log('[SESSION] Show by user');
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

// ===== UNIVERSAL CATCH-ALL (pass through) =====
bot.on('message', (ctx, next) => {
  console.log(`[UNIVERSAL] Received message: "${ctx.message.text?.slice(0, 50)}" from ${ctx.from.id}`);
  return next();  // Important: let other handlers process it
});

// ===== Text Messages: Chat with Claude =====
bot.on('text', async (ctx) => {
  const task = ctx.message.text;
  console.log(`[TEXT] Handler triggered for: "${task}"`);

  if (task.startsWith('/')) {
    console.log('[TEXT] Skipping command (starts with /)');
    return;
  }

  const userId = ctx.from.id;
  const userName = ctx.from.first_name || 'unknown';

  // ===== Session Management =====
  let session = loadSession();
  if (!session) {
    session = createNewSession();
    console.log('[SESSION] Created new session');
  }

  // Add user message to session
  session = addMessageToSession(session, 'user', task);
  saveSession(session);
  console.log(`[SESSION] Saved message (total: ${session.messages.length})`);

  // Extract conversation history (all messages except the one we just added)
  const conversationHistory = session.messages.slice(0, -1).map(m => ({
    role: m.role,
    content: m.content
  }));

  console.log(`[TEXT] User: ${userName} (${userId})`);

  try {
    // Send typing indicator
    await ctx.sendChatAction('typing');
    console.log('[TEXT] Sent typing indicator');

    // Call Claude from main agent directory
    console.log(`[CLAUDE] Calling from /opt/claude-agent with ${conversationHistory.length} prior messages`);
    const response = callClaude(task, conversationHistory);

    if (response) {
      console.log(`[CLAUDE] Got response: ${response.slice(0, 100)}`);

      // Add assistant response to session
      session = addMessageToSession(session, 'assistant', response);
      saveSession(session);
      console.log(`[SESSION] Added response to session (total: ${session.messages.length})`);

      // Send response to Telegram
      const truncated = response.length > 4096
        ? response.slice(0, 4090) + '...'
        : response;
      await ctx.reply(truncated);
      console.log('[TEXT] Response sent');
    } else {
      console.error('[CLAUDE] No response');
      await ctx.reply('❌ Error: Could not get response from Claude');
    }
  } catch (err) {
    console.error('[TEXT] Exception:', err.message);
    await ctx.reply('❌ Error processing your message');
  }
});

// ===== Command Approval Handlers =====
bot.action(/approve:(.+)/, async (ctx) => {
  const encodedCommand = ctx.match[1];
  const command = Buffer.from(encodedCommand, 'base64').toString('utf8');

  if (!global.pendingCommand) {
    await ctx.answerCbQuery('No pending command');
    return;
  }

  if (global.pendingCommand.command !== command) {
    await ctx.answerCbQuery('Command mismatch');
    return;
  }

  console.log(`[APPROVAL] User approved: ${command}`);

  try {
    // Execute the command
    const result = executeCommand(command);

    if (result.success) {
      const output = result.output.slice(0, 4000) || '(no output)';
      await ctx.editMessageText(
        `✅ Executed:\n\`${command}\`\n\nResult:\n\`\`\`\n${output}\n\`\`\``
      );

      // Add to session
      let session = loadSession();
      if (session) {
        session = addMessageToSession(session, 'assistant', `Command executed:\n\`${command}\`\n\nResult:\n${output}`);
        saveSession(session);
      }
    } else {
      await ctx.editMessageText(`❌ Error:\n${result.error}`);
    }

    global.pendingCommand = null;
    await ctx.answerCbQuery();
  } catch (err) {
    console.error('[APPROVAL] Exception:', err.message);
    await ctx.answerCbQuery('Error executing command');
  }
});

bot.action('reject', async (ctx) => {
  console.log('[APPROVAL] User rejected');
  global.pendingCommand = null;
  await ctx.editMessageText('❌ Command rejected');
  await ctx.answerCbQuery('Command rejected');
});

// ===== Batch Approval Handlers =====
bot.action(/batch:(.+)/, async (ctx) => {
  await handleBatchApproval(ctx, bot, GROUP_ID);
});

// ===== Individual Proposal Approval Handlers =====
bot.action(/approve:(.+)/, async (ctx) => {
  const proposalId = ctx.match[1];
  const approverName = ctx.from.first_name;

  if (propose.handleApproval(proposalId, approverName)) {
    ctx.answerCbQuery(`✅ Approved by ${approverName}`);
    await ctx.editMessageText(`${ctx.message.text}\n\n✅ **APPROVED** by ${approverName}`);

    // Try to create skill if this was a skill proposal
    const proposals = propose.getProposals();
    const proposal = proposals.approved.find(p => p.id === proposalId);

    let skillMsg = '';
    if (proposal && proposal.type === 'skill') {
      const creator = new SkillCreator();
      if (creator.createSkillFromProposal(proposal)) {
        skillMsg = `\n📦 Skill \`${proposal.name}\` created automatically`;
      }
    }

    await bot.telegram.sendMessage(GROUP_ID, `🎉 Proposal \`${proposalId}\` approved by ${approverName}! Agent will proceed.${skillMsg}`);
  } else {
    ctx.answerCbQuery('Proposal not found');
  }
});

bot.action(/reject:(.+)/, async (ctx) => {
  const proposalId = ctx.match[1];
  const rejectorName = ctx.from.first_name;

  if (propose.handleRejection(proposalId, rejectorName)) {
    ctx.answerCbQuery(`❌ Rejected by ${rejectorName}`);
    await ctx.editMessageText(`${ctx.message.text}\n\n❌ **REJECTED** by ${rejectorName}`);
    await bot.telegram.sendMessage(GROUP_ID, `⛔ Proposal \`${proposalId}\` rejected by ${rejectorName}.`);
  } else {
    ctx.answerCbQuery('Proposal not found');
  }
});

// ===== HTTP Endpoints & Webhook =====
const app = express();
app.use(express.json());

// Health check
app.get('/health', (_, res) => {
  console.log('[HEALTH] Health check requested');
  res.json({ status: 'ok' });
});

// Telegram webhook endpoint
app.post('/telegram', async (req, res) => {
  const update = req.body;
  console.log(`[WEBHOOK] Received update ${update.update_id}`);

  try {
    // Handle message updates directly for now
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat?.id;
      const userId = msg.from?.id;
      const text = msg.text;

      console.log(`[WEBHOOK-MSG] From ${userId}, Chat ${chatId}, Text: ${text?.slice(0, 50)}`);

      // Only process if authorized
      if (chatId === GROUP_ID && isAllowed(userId)) {
        console.log('[WEBHOOK-MSG] ✅ Authorized');

        // Handle /reset command
        if (text === '/reset') {
          if (fs.existsSync(SESSION_FILE)) {
            fs.unlinkSync(SESSION_FILE);
            console.log('[WEBHOOK-CMD] Session reset');
          }
        }
        // Handle /show command
        else if (text === '/show') {
          const session = loadSession();
          if (session && session.messages.length > 0) {
            const recent = session.messages.slice(-10);
            let msg = `📖 **Conversation** (${session.messages.length} messages)\n\n`;
            for (const m of recent) {
              const speaker = m.role === 'user' ? '👤' : '🤖';
              const content = m.content.length > 100 ? m.content.slice(0, 100) + '...' : m.content;
              msg += `${speaker}: ${content}\n`;
            }
            await bot.telegram.sendMessage(chatId, msg);
          }
        }
        // Handle regular text messages
        else if (text && !text.startsWith('/')) {
          // Load or create session
          let session = loadSession();
          if (!session) {
            session = createNewSession();
            console.log('[WEBHOOK-SESSION] Created new session');
          }

          // Add user message to session
          session = addMessageToSession(session, 'user', text);
          saveSession(session);
          console.log(`[WEBHOOK-SESSION] Saved message (total: ${session.messages.length})`);

          // Extract conversation history for Claude
          const conversationHistory = session.messages.slice(0, -1).map(m => ({
            role: m.role,
            content: m.content
          }));

          // Send "typing" indicator
          await bot.telegram.sendChatAction(chatId, 'typing');

          // Call Claude directly
          console.log(`[CLAUDE] Calling with context: ${conversationHistory.length} prior messages`);
          const response = callClaude(text, conversationHistory);

          if (response) {
            console.log(`[CLAUDE] Got response: ${response.slice(0, 100)}`);

            // Add assistant response to session
            session = addMessageToSession(session, 'assistant', response);
            saveSession(session);
            console.log(`[WEBHOOK-SESSION] Added response to session (total: ${session.messages.length})`);

            // Send response to Telegram
            const truncated = response.length > 4096
              ? response.slice(0, 4090) + '...'
              : response;
            await bot.telegram.sendMessage(chatId, truncated);
          } else {
            console.error('[CLAUDE] No response received');
            await bot.telegram.sendMessage(chatId, '❌ Error: Could not get response from Claude');
          }
        }
      } else {
        console.log('[WEBHOOK-MSG] ❌ Not authorized');
      }
    }

    // Use Telegraf handler as fallback for other update types
    await bot.handleUpdate(update);
  } catch (err) {
    console.error('[WEBHOOK] Error:', err.message);
  }

  res.json({ ok: true });
});

// Debug endpoint - check configuration
app.get('/debug', (_, res) => {
  res.json({
    GROUP_ID,
    OWNER_ID,
    WIFE_ID,
    BOT_TOKEN_EXISTS: !!process.env.BOT_TOKEN,
    polling_active: 'check logs'
  });
});

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

// ===== Debug middleware =====
bot.use((ctx, next) => {
  console.log(`[DEBUG] Message from ${ctx.from?.first_name} (ID: ${ctx.from?.id}), Chat: ${ctx.chat?.id}, Text: ${ctx.message?.text?.slice(0, 50)}`);
  return next();
});

// ===== Task Completion Monitor =====
async function monitorTaskCompletion() {
  try {
    const state = getAgentState();
    const completedTasks = state.completed_tasks || [];

    for (const task of completedTasks) {
      if (task.metadata?.session_response_sent) continue; // Already processed for session
      if (task.source !== 'telegram') continue; // Only Telegram tasks
      if (!task.result) continue; // No result yet

      console.log(`[MONITOR] Processing completed task: ${task.id.slice(0, 8)}`);

      // Load current session and append assistant response
      let session = loadSession();
      if (session) {
        session = addMessageToSession(session, 'assistant', task.result);
        saveSession(session);
        console.log(`[MONITOR] Appended response to session (total: ${session.messages.length})`);
      }

      // Send result back to chat
      if (GROUP_ID && task.notify_on_complete) {
        const taskStatus = task.error ? '❌ Failed' : '✅ Complete';
        const responseText = task.error ? `Error: ${task.error}` : task.result;
        const message = `${taskStatus} (Task: ${task.id.slice(0, 8)})\n\n${responseText.slice(0, 2000)}`;

        try {
          await bot.telegram.sendMessage(GROUP_ID, message);
          console.log(`[MONITOR] Notification sent to chat`);
        } catch (err) {
          console.error(`[MONITOR] Failed to send notification:`, err.message);
        }
      }

      // Mark task as processed for session to prevent duplicate appending
      task.metadata = task.metadata || {};
      task.metadata.session_response_sent = true;
      writeAgentState(state);
    }
  } catch (err) {
    console.error('[MONITOR] Error in task completion monitor:', err.message);
  }
}

// Start monitoring every 2 seconds
setInterval(monitorTaskCompletion, 2000);

// ===== Launch Bot with Polling =====
bot.launch().then(() => {
  console.log('[BOT] ✅ Successfully launched - polling for updates');
}).catch(err => {
  console.error('[BOT] Launch error:', err.message);
  // Still allow webhook to work even if polling fails
  console.log('[BOT] Will accept updates via /telegram webhook endpoint');
});

process.once('SIGINT', () => {
  console.log('[BOT] Stopping...');
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  console.log('[BOT] Stopping...');
  bot.stop('SIGTERM');
});

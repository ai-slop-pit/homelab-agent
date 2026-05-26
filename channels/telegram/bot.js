const { Telegraf } = require('telegraf');
const { spawnSync } = require('child_process');
const express = require('express');
const fs = require('fs');
const path = require('path');
const propose = require('../../agent/proposer');
const { batcher, handleBatchApproval, checkAndSendBatch } = require('./batch-handler');
const { SkillCreator } = require('../../agent/skill-creator');
const { TopicManager } = require('./topic-manager');
const { ApprovalHandler } = require('../../agent/approval-handler');

const bot = new Telegraf(process.env.BOT_TOKEN);
const THREADS_DIR = '/opt/claude-agent/threads';
const AGENT_STATE = '/opt/claude-agent/state/agent-state.json';
const CONFIG_FILE = '/opt/claude-agent/config/telegram-config.json';
const SESSION_FILE = '/opt/claude-agent/state/current-session.json';

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

// Initialize topic manager
const topicManager = new TopicManager();

// Initialize approval handler
const approvalHandler = new ApprovalHandler();

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

// ===== Direct Claude Integration with Streaming =====
function callClaudeStreaming(userMessage, conversationHistory = [], onChunk = null) {
  return new Promise((resolve, reject) => {
    try {
      const { spawn } = require('child_process');

      // Build prompt with conversation context
      let prompt = '';
      if (conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
          prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
        }
      }
      prompt += `User: ${userMessage}`;

      // Call Claude CLI from /opt/claude-agent to load CLAUDE.md context
      const proc = spawn('/usr/bin/claude', ['-p', prompt], {
        cwd: '/opt/claude-agent',
        env: { ...process.env, HOME: '/home/claude' }
      });

      let output = '';
      let lastUpdate = Date.now();
      const UPDATE_INTERVAL = 500; // ms between updates to Telegram

      proc.stdout.on('data', (data) => {
        output += data.toString();

        // Send incremental updates to Telegram (throttled)
        const now = Date.now();
        if (onChunk && now - lastUpdate > UPDATE_INTERVAL) {
          onChunk(output);
          lastUpdate = now;
        }
      });

      proc.stderr.on('data', (data) => {
        console.error('[CLAUDE] Stderr:', data.toString());
      });

      proc.on('error', (err) => {
        console.error('[CLAUDE] Spawn error:', err.message);
        reject(err);
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          console.error('[CLAUDE] Exit code:', code);
          reject(new Error(`Claude exited with code ${code}`));
          return;
        }

        const finalOutput = output.trim();
        if (!finalOutput) {
          console.error('[CLAUDE] Empty response');
          reject(new Error('Empty response from Claude'));
          return;
        }

        // Send final update
        if (onChunk) {
          onChunk(finalOutput);
        }
        resolve(finalOutput);
      });

      // Timeout after 95 seconds
      setTimeout(() => {
        proc.kill();
        reject(new Error('Claude CLI timeout'));
      }, 95000);
    } catch (err) {
      console.error('[CLAUDE] Exception:', err.message);
      reject(err);
    }
  });
}

// Fallback sync version for backwards compatibility
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
    prompt += `User: ${userMessage}`;

    // Call Claude CLI from /opt/claude-agent to load CLAUDE.md context
    const result = spawnSync('/usr/bin/claude', ['-p', prompt], {
      encoding: 'utf8',
      timeout: 90000,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: '/opt/claude-agent',
      env: { ...process.env, HOME: '/home/claude' }
    });

    if (result.error) {
      console.error('[CLAUDE] Spawn error:', result.error.message);
      return null;
    }

    if (result.status !== 0) {
      console.error('[CLAUDE] Exit code:', result.status);
      console.error('[CLAUDE] Stderr:', result.stderr);
      console.error('[CLAUDE] Stdout:', result.stdout?.slice(0, 200));
      return null;
    }

    const output = result.stdout?.trim();
    if (!output) {
      console.error('[CLAUDE] Empty response from claude CLI');
      return null;
    }

    return output;
  } catch (err) {
    console.error('[CLAUDE] Exception:', err.message);
    return null;
  }
}

const SAFE_PREFIX = 'You are a helpful home assistant. Answer questions about home status, reminders, schedules, and media. Do NOT run system commands, modify files, SSH anywhere, or perform destructive actions. Be friendly and concise.\n\nQuestion: ';

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
  await ctx.reply('🤖 Creating system-proposals topic...');

  const proposalResults = await topicManager.createProposalTopics(bot, GROUP_ID);
  const proposalStatus = proposalResults.map(r =>
    r.success ? `${r.topicName} ✅` : `${r.topicName} ❌`
  );

  await ctx.reply(`✨ Setup complete!\n\n${proposalStatus.join('\n')}`);
});

// ===== Topic Management Commands =====
bot.command('createtopics', async (ctx) => {
  if (!isOwner(ctx.from?.id)) return ctx.reply('Owner only.');

  await ctx.reply('🤖 Creating proposal topics...');
  const results = await topicManager.createProposalTopics(bot, GROUP_ID);

  const summary = results.map(r => {
    if (r.success) {
      return `✅ ${r.topicName} (ID: ${r.topicId})`;
    } else {
      return `❌ ${r.topicName}: ${r.error}`;
    }
  }).join('\n');

  await ctx.reply(`📌 Topic Creation Results\n\n${summary}`);
});

bot.command('listtopics', async (ctx) => {
  const topics = topicManager.listTopics();

  if (topics.length === 0) {
    return ctx.reply('No topics configured yet. Use /createtopics');
  }

  let msg = '📋 **Configured Topics**\n\n';
  for (const topic of topics) {
    msg += `🔹 **${topic.name}** (ID: ${topic.id})\n`;
    msg += `   Created: ${topic.created}\n`;
    msg += `   ${topic.description}\n\n`;
  }

  ctx.reply(msg);
});

bot.command('addtopic', async (ctx) => {
  if (!isOwner(ctx.from?.id)) return ctx.reply('Owner only.');

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) return ctx.reply('Usage: /addtopic <name> [description...]');

  const topicName = args[0];
  const description = args.slice(1).join(' ') || '';

  const result = await topicManager.createTopic(bot, GROUP_ID, topicName, description);

  if (result.success) {
    ctx.reply(`✅ Topic "${topicName}" created (ID: ${result.topicId})`);
  } else {
    ctx.reply(`❌ Failed to create topic: ${result.error}`);
  }
});

bot.command('cleanup', async (ctx) => {
  if (!isOwner(ctx.from?.id)) return ctx.reply('Owner only.');

  await ctx.reply('🧹 Deleting old proposal topics...');

  const oldTopics = ['proposals-skills', 'proposals-automations', 'proposals-system', 'proposals-learning'];
  const results = [];

  for (const topicName of oldTopics) {
    const topicId = topicManager.getTopicId(topicName);
    if (topicId) {
      const result = await topicManager.deleteTopic(bot, GROUP_ID, topicId);
      if (result.success) {
        topicManager.removeTopic(topicName);
        results.push(`✅ Deleted ${topicName}`);
      } else {
        results.push(`❌ ${topicName}: ${result.error}`);
      }
    } else {
      results.push(`⏭️ ${topicName}: Not found`);
    }
  }

  ctx.reply(`🧹 **Cleanup Complete**\n\n${results.join('\n')}`);
});

bot.command('new', async (ctx) => {
  const threadId = ctx.message?.message_thread_id || '0';
  fs.rmSync(path.join(getThreadDir(threadId), '.claude'), { recursive: true, force: true });
  ctx.reply('Fresh session started.');
});

// ===== Approval Display Command =====
bot.command('approvals', async (ctx) => {
  const pending = approvalHandler.getPendingApprovals();

  if (pending.length === 0) {
    ctx.reply('📭 No pending approvals');
    return;
  }

  let response = `🔒 **Pending Approvals (${pending.length})**\n\n`;

  for (const approval of pending) {
    response += approvalHandler.formatApproval(approval) + '\n\n';

    // Create inline buttons for each approval
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '✅ Approve',
            callback_data: `approve_action:${approval.id}`,
          },
          {
            text: '❌ Reject',
            callback_data: `reject_action:${approval.id}`,
          },
        ],
      ],
    };

    await ctx.replyWithMarkdown(approvalHandler.formatApproval(approval), keyboard);
  }
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

    // Call Claude with streaming updates
    console.log(`[TEXT-CLAUDE] Calling with ${conversationHistory.length} prior messages`);

    let sentMessage = null;
    let lastMessageText = '';
    let updateCount = 0;

    // Stream handler updates message as response arrives
    const onChunk = async (chunk) => {
      try {
        const truncated = chunk.length > 4096 ? chunk.slice(0, 4090) + '...' : chunk;

        // First message or update every ~500ms
        if (!sentMessage) {
          sentMessage = await ctx.reply('🤔 ' + truncated);
          lastMessageText = truncated;
          console.log('[TEXT] Initial response sent');
        } else if (truncated !== lastMessageText && chunk.length % 50 === 0) {
          // Update message every 50 chars (throttled)
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              sentMessage.message_id,
              undefined,
              '⏳ ' + truncated
            );
            lastMessageText = truncated;
            updateCount++;
          } catch (e) {
            // Ignore "message is not modified" errors
            if (!e.message?.includes('not modified')) {
              console.error('[TEXT] Edit error:', e.message);
            }
          }
        }
      } catch (err) {
        console.error('[TEXT-STREAM] Chunk error:', err.message);
      }
    };

    try {
      const response = await callClaudeStreaming(task, conversationHistory, onChunk);

      console.log(`[TEXT-CLAUDE] Got full response (${updateCount} updates)`);

      // Add assistant response to session
      session = addMessageToSession(session, 'assistant', response);
      saveSession(session);
      console.log(`[SESSION] Added response to session (total: ${session.messages.length})`);

      // Final message update with checkmark
      const truncated = response.length > 4096
        ? response.slice(0, 4090) + '...'
        : response;

      if (sentMessage) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          sentMessage.message_id,
          undefined,
          '✅ ' + truncated
        );
      } else {
        await ctx.reply('✅ ' + truncated);
      }
      console.log('[TEXT] Response complete');
    } catch (err) {
      console.error('[TEXT-CLAUDE] Stream error:', err.message);
      if (sentMessage) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          sentMessage.message_id,
          undefined,
          `❌ Error: ${err.message}`
        );
      } else {
        await ctx.reply(`❌ Error: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('[TEXT] Exception:', err.message);
    await ctx.reply('❌ Error processing your message');
  }
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

// ===== CLI Approval Handlers =====
bot.action(/approve_action:(.+)/, async (ctx) => {
  const approvalId = ctx.match[1];
  const approverName = ctx.from.first_name;

  const result = approvalHandler.respondToApproval(approvalId, 'approved');

  if (result.success) {
    ctx.answerCbQuery(`✅ Approval granted`);
    await ctx.editMessageText(`${ctx.message.text}\n\n✅ **APPROVED** by ${approverName}`);
    await bot.telegram.sendMessage(GROUP_ID, `🔓 CLI action approved by ${approverName}`);
  } else {
    ctx.answerCbQuery(`❌ ${result.error}`);
  }
});

bot.action(/reject_action:(.+)/, async (ctx) => {
  const approvalId = ctx.match[1];
  const rejectorName = ctx.from.first_name;

  const result = approvalHandler.respondToApproval(approvalId, 'rejected', `Rejected by ${rejectorName}`);

  if (result.success) {
    ctx.answerCbQuery(`❌ Approval rejected`);
    await ctx.editMessageText(`${ctx.message.text}\n\n❌ **REJECTED** by ${rejectorName}`);
    await bot.telegram.sendMessage(GROUP_ID, `🔒 CLI action rejected by ${rejectorName}`);
  } else {
    ctx.answerCbQuery(`❌ ${result.error}`);
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

          // Call Claude with streaming
          console.log(`[CLAUDE] Calling with context: ${conversationHistory.length} prior messages`);

          let sentMessage = null;
          let lastMessageText = '';
          let updateCount = 0;

          const onChunk = async (chunk) => {
            try {
              const truncated = chunk.length > 4096 ? chunk.slice(0, 4090) + '...' : chunk;

              if (!sentMessage) {
                sentMessage = await bot.telegram.sendMessage(chatId, '🤔 ' + truncated);
                lastMessageText = truncated;
              } else if (truncated !== lastMessageText && chunk.length % 50 === 0) {
                try {
                  await bot.telegram.editMessageText(
                    chatId,
                    sentMessage.message_id,
                    undefined,
                    '⏳ ' + truncated
                  );
                  lastMessageText = truncated;
                  updateCount++;
                } catch (e) {
                  if (!e.message?.includes('not modified')) {
                    console.error('[WEBHOOK-STREAM] Edit error:', e.message);
                  }
                }
              }
            } catch (err) {
              console.error('[WEBHOOK-STREAM] Chunk error:', err.message);
            }
          };

          try {
            const response = await callClaudeStreaming(text, conversationHistory, onChunk);

            // Add assistant response to session
            session = addMessageToSession(session, 'assistant', response);
            saveSession(session);

            const truncated = response.length > 4096
              ? response.slice(0, 4090) + '...'
              : response;

            if (sentMessage) {
              await bot.telegram.editMessageText(
                chatId,
                sentMessage.message_id,
                undefined,
                '✅ ' + truncated
              );
            } else {
              await bot.telegram.sendMessage(chatId, '✅ ' + truncated);
            }
          } catch (err) {
            console.error('[WEBHOOK-STREAM] Error:', err.message);
            if (sentMessage) {
              await bot.telegram.editMessageText(
                chatId,
                sentMessage.message_id,
                undefined,
                `❌ Error: ${err.message}`
              );
            } else {
              await bot.telegram.sendMessage(chatId, `❌ Error: ${err.message}`);
            }
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

// Telegram Batch Handler - integrates ProposalBatcher with telegram-bot
// Handles sending batch messages and processing approvals

const { ProposalBatcher } = require('./proposal-batcher');
const propose = require('./agent-propose');

const batcher = new ProposalBatcher();

async function sendBatchIfReady(bot, groupId) {
  if (!batcher.isTimeToFlush() || batcher.queue.proposals.length === 0) {
    return null;
  }

  const message = batcher.generateBatchMessage();
  if (!message) return null;

  try {
    // Build inline keyboard for batch approval
    const keyboard = [];

    // Group proposals for display
    const grouped = batcher.groupByType();

    // Add approval options
    keyboard.push([
      { text: '✅ Approve All', callback_data: `batch:approve_all:${batcher.queue.proposals.length}` },
      { text: '❌ Reject All', callback_data: `batch:reject_all:${batcher.queue.proposals.length}` }
    ]);

    const sentMsg = await bot.telegram.sendMessage(groupId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });

    // Flush and return
    const batch = batcher.flushBatch();
    console.log(`✅ Batch sent to Telegram (${batch.proposal_count} proposals)`);

    return batch;
  } catch (err) {
    console.error(`Error sending batch: ${err.message}`);
    return null;
  }
}

async function handleBatchApproval(ctx, bot, groupId) {
  const [, action, count] = ctx.match || [];

  if (!action) {
    ctx.answerCbQuery('Invalid action');
    return;
  }

  const approverName = ctx.from.first_name || 'user';

  // For now, all batch approvals create proposal entries
  // In production, you'd track which specific proposals were approved
  if (action === 'approve_all') {
    ctx.answerCbQuery(`✅ Batch approved by ${approverName}`);
    await ctx.editMessageText(`${ctx.message.text}\n\n✅ **APPROVED** all ${count} proposals by ${approverName}!`);
    await bot.telegram.sendMessage(groupId, `🎉 Batch approved by ${approverName}! (${count} proposals)\n\nAgent will proceed with implementation.`);
  } else if (action === 'reject_all') {
    ctx.answerCbQuery(`❌ Batch rejected by ${approverName}`);
    await ctx.editMessageText(`${ctx.message.text}\n\n❌ **REJECTED** all ${count} proposals by ${approverName}`);
    await bot.telegram.sendMessage(groupId, `⛔ Batch rejected by ${approverName}. (${count} proposals held for reconsideration)`);
  }
}

// Check and send batch periodically
async function checkAndSendBatch(bot, groupId) {
  return sendBatchIfReady(bot, groupId);
}

module.exports = {
  batcher,
  sendBatchIfReady,
  handleBatchApproval,
  checkAndSendBatch
};

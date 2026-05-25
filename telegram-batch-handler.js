// Telegram Batch Handler - integrates ProposalBatcher with telegram-bot
// Handles sending batch messages and processing approvals

const { ProposalBatcher } = require('./proposal-batcher');
const { TopicManager } = require('./topic-manager');
const propose = require('./agent-propose');

const batcher = new ProposalBatcher();
const topicManager = new TopicManager();

async function sendBatchIfReady(bot, groupId) {
  if (!batcher.isTimeToFlush() || batcher.queue.proposals.length === 0) {
    return null;
  }

  try {
    // Group proposals by type for routing to different topics
    const grouped = batcher.groupByType();

    // Send each group to its topic
    const sentMessages = [];
    const topicSummary = [];

    for (const [proposalType, proposals] of Object.entries(grouped)) {
      if (proposals.length === 0) continue;

      const routing = topicManager.getRoutingInfo(proposalType);
      const topicId = routing.topicId;

      // Format messages for this topic
      let topicMessage = `🤖 **${proposalType.toUpperCase()} PROPOSALS** (${proposals.length})\n\n`;

      for (const prop of proposals) {
        topicMessage += `**${prop.name}**\n`;
        topicMessage += `📝 ${prop.description.slice(0, 100)}\n`;
        topicMessage += `━━━━━━━━━━━━━\n`;
      }

      // Build inline keyboard with topic-specific controls
      const keyboard = [[
        { text: '✅ Approve', callback_data: `batch:approve_all:${proposals.length}` },
        { text: '❌ Reject', callback_data: `batch:reject_all:${proposals.length}` }
      ]];

      try {
        // Send to topic if ID exists, otherwise send to group
        const sendOptions = {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard
          }
        };

        if (topicId) {
          sendOptions.message_thread_id = topicId;
          console.log(`[TOPICS] Routing ${proposalType} to topic ${routing.topicName} (ID: ${topicId})`);
        } else {
          console.log(`[TOPICS] No topic for ${proposalType}, sending to main group`);
        }

        const sentMsg = await bot.telegram.sendMessage(groupId, topicMessage, sendOptions);
        sentMessages.push(sentMsg);
        topicSummary.push(`✅ ${routing.topicName}: ${proposals.length} proposals`);
      } catch (err) {
        console.error(`[TOPICS] Failed to send to ${routing.topicName}:`, err.message);
        topicSummary.push(`❌ ${routing.topicName}: ${err.message}`);
      }
    }

    // Flush and notify
    const batch = batcher.flushBatch();

    if (sentMessages.length > 0) {
      const summaryMsg = `📦 **Batch Sent** (${batch.proposal_count} proposals)\n\n${topicSummary.join('\n')}`;
      await bot.telegram.sendMessage(groupId, summaryMsg);
    }

    console.log(`✅ Batch sent to topics (${batch.proposal_count} proposals)`);
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

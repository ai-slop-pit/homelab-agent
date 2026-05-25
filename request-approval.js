#!/usr/bin/env node
/**
 * Request Approval via Telegram - CLI waits for user response
 * Usage: node request-approval.js "delete-topics" "Delete old proposal topics?" ["proposals-skills", "proposals-automations", ...]
 */

const { ApprovalHandler } = require('./approval-handler');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID = -1003951507653; // Your group ID from config

async function requestApprovalViaTelegram(action, description, items = []) {
  const handler = new ApprovalHandler();

  // Step 1: Create approval request
  const approvalId = handler.requestApproval(action, {
    description,
    items,
    warning: action === 'delete' ? '⚠️ This action cannot be undone' : null,
  });

  console.log(`[APPROVAL] Created approval request: ${approvalId}`);
  console.log(`[APPROVAL] Action: ${action}`);
  console.log(`[APPROVAL] Description: ${description}`);

  // Step 2: Send Telegram message with buttons
  try {
    const message = formatApprovalMessage(approvalId, action, description, items);
    const buttons = [
      [
        { text: '✅ Approve', callback_data: `approve_action:${approvalId}` },
        { text: '❌ Reject', callback_data: `reject_action:${approvalId}` },
      ],
    ];

    await sendTelegramMessage(message, buttons);
    console.log(`[APPROVAL] Telegram notification sent to group`);
  } catch (err) {
    console.error('[APPROVAL] Failed to send Telegram message:', err.message);
  }

  // Step 3: Wait for user response (5 minute timeout)
  console.log('[APPROVAL] Waiting for user response...');
  const result = await handler.checkApproval(approvalId, 300000);

  if (result.status === 'approved') {
    console.log(`[APPROVAL] ✅ Approved by user`);
    return { approved: true, approvalId };
  } else if (result.status === 'rejected') {
    console.log(`[APPROVAL] ❌ Rejected by user: ${result.reason}`);
    return { approved: false, approvalId, reason: result.reason };
  } else if (result.status === 'timeout') {
    console.log(`[APPROVAL] ⏱️ Timeout - no response within 5 minutes`);
    return { approved: false, approvalId, reason: 'Timeout' };
  }

  return { approved: false, approvalId };
}

function formatApprovalMessage(approvalId, action, description, items) {
  let msg = `🔒 **Action Approval Needed**\n\n`;
  msg += `📋 ${description}\n`;

  if (items && items.length > 0) {
    msg += `\nAffected items:\n`;
    items.forEach((item) => {
      msg += `  • \`${item}\`\n`;
    });
  }

  msg += `\n⏱️ You have 5 minutes to approve or reject.\n`;
  msg += `ID: \`${approvalId}\``;

  return msg;
}

async function sendTelegramMessage(text, replyMarkup) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const payload = {
    chat_id: GROUP_ID,
    text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: replyMarkup,
    },
  };

  const response = await axios.post(url, payload);
  return response.data;
}

// Export for use in other scripts
module.exports = { requestApprovalViaTelegram };

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const action = args[0] || 'delete';
  const description = args[1] || 'Approve this action?';
  const items = args.slice(2);

  requestApprovalViaTelegram(action, description, items)
    .then((result) => {
      if (result.approved) {
        console.log('\n✅ Proceeding with action...');
        process.exit(0);
      } else {
        console.log('\n❌ Action cancelled');
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('[ERROR]', err.message);
      process.exit(1);
    });
}

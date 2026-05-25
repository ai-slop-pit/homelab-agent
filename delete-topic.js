#!/usr/bin/env node
/**
 * Delete Telegram topics from CLI
 * Usage: node delete-topic.js "topic-name" ["topic-name2", ...]
 *        node delete-topic.js "proposals-skills" "proposals-automations"
 */

const fs = require('fs');
const https = require('https');
const { ApprovalHandler } = require('./approval-handler');
const { ApprovalNotifier } = require('./approval-notifier');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const CONFIG_PATH = './.claude/telegram-config.json';
const approval = new ApprovalHandler();
const notifier = new ApprovalNotifier(BOT_TOKEN);

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

function apiCall(method, params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params);

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.ok) {
            resolve(result.result);
          } else {
            reject(new Error(result.description));
          }
        } catch (e) {
          reject(new Error(`API parse error: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function deleteTopic(groupId, topicId, topicName) {
  try {
    await apiCall('deleteForumTopic', {
      chat_id: groupId,
      message_thread_id: topicId,
    });

    return {
      success: true,
      topicId: topicId,
      name: topicName,
    };
  } catch (error) {
    return {
      success: false,
      topicId: topicId,
      name: topicName,
      error: error.message,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  node delete-topic.js "topic-name"
  node delete-topic.js "proposals-skills" "proposals-automations"

Examples:
  node delete-topic.js "proposals-skills"
  node delete-topic.js "proposals-automations" "proposals-system" "proposals-learning"
    `);
    process.exit(1);
  }

  // Load config
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    console.error('❌ Could not load config.json');
    process.exit(1);
  }

  // Get first group (main one)
  const group = config.groups?.[0];
  if (!group) {
    console.error('❌ No groups configured in telegram-config.json');
    process.exit(1);
  }

  // Request approval from Telegram
  console.log(`\n🔒 Requesting approval from Telegram...\n`);

  const approvalId = approval.requestApproval('delete-topics', {
    description: `Delete the following topics from **${group.name}**:`,
    items: args,
    warning: 'This action cannot be undone. Topics will be permanently deleted.',
  });

  console.log(`Approval ID: ${approvalId}`);

  // Send approval request to Telegram
  const approvalData = approval.state.approvals[approvalId];
  const sent = await notifier.notifyApproval(approvalData, (a) => approval.formatApproval(a));

  if (sent) {
    console.log('📱 Approval request sent to Telegram group');
  } else {
    console.warn('⚠️  Could not send to Telegram, waiting for manual approval...');
  }

  console.log('Waiting for approval (timeout: 5 minutes)...\n');

  // Wait for approval (timeout: 5 minutes)
  const response = await approval.checkApproval(approvalId);

  if (response.status === 'approved') {
    console.log('✅ Approval granted! Proceeding with deletion...\n');
  } else if (response.status === 'rejected') {
    console.log(`❌ Approval rejected${response.reason ? ': ' + response.reason : ''}`);
    process.exit(1);
  } else if (response.status === 'timeout') {
    console.log('⏱️  Approval request timed out (5 minutes)');
    process.exit(1);
  } else {
    console.log(`❌ Approval error: ${response.status}`);
    process.exit(1);
  }

  console.log(`\n🗑️  Deleting topics from group: ${group.name}\n`);

  const results = [];
  for (const topicName of args) {
    const topicInfo = config.topics?.[topicName];

    if (!topicInfo) {
      console.log(`⚠️  "${topicName}" not found in config`);
      results.push({ success: false, name: topicName, error: 'Not in config' });
      continue;
    }

    process.stdout.write(`Deleting "${topicName}" (ID: ${topicInfo.id})... `);
    const result = await deleteTopic(group.id, topicInfo.id, topicName);

    if (result.success) {
      console.log(`✅`);
      delete config.topics[topicName];
    } else {
      console.log(`❌ ${result.error}`);
    }
    results.push(result);
  }

  // Save updated config
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log('\n✅ Config updated');

  // Summary
  const successful = results.filter(r => r.success).length;
  console.log(`\n📊 Result: ${successful}/${results.length} topics deleted\n`);
}

main().catch(console.error);

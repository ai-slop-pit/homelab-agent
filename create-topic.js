#!/usr/bin/env node
/**
 * Create Telegram topics from CLI
 * Usage: node create-topic.js "topic-name" [description]
 *        node create-topic.js "skills" "New skill proposals"
 */

const fs = require('fs');
const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CONFIG_PATH = './.claude/telegram-config.json';

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

async function createTopic(groupId, name, description = '') {
  try {
    const result = await apiCall('createForumTopic', {
      chat_id: groupId,
      name: name,
      icon_color: 5437945, // green
    });

    return {
      success: true,
      topicId: result.message_thread_id,
      name: name,
    };
  } catch (error) {
    return {
      success: false,
      name: name,
      error: error.message,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  node create-topic.js "topic-name"
  node create-topic.js "skills" "New skill proposals"
  node create-topic.js "skills" "automations" "system"

Examples:
  node create-topic.js "proposals-skills"
  node create-topic.js "alerts" "System alerts and monitoring"
    `);
    process.exit(1);
  }

  // Load config
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    config = { groups: [], topics: {} };
  }

  // Get first group (main one)
  const group = config.groups?.[0];
  if (!group) {
    console.error('❌ No groups configured in telegram-config.json');
    process.exit(1);
  }

  // Initialize topics storage
  if (!config.topics) {
    config.topics = {};
  }

  console.log(`\n📍 Creating topics in group: ${group.name}\n`);

  // Create each topic
  const results = [];
  for (const topicName of args) {
    process.stdout.write(`Creating "${topicName}"... `);
    const result = await createTopic(group.id, topicName);

    if (result.success) {
      console.log(`✅ (ID: ${result.topicId})`);
      config.topics[topicName] = {
        id: result.topicId,
        name: topicName,
        createdAt: new Date().toISOString(),
      };
    } else {
      console.log(`❌ ${result.error}`);
    }
    results.push(result);
  }

  // Save config
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

  console.log('\n✅ Config saved to', CONFIG_PATH);

  // Summary
  const successful = results.filter(r => r.success).length;
  console.log(`\n📊 Result: ${successful}/${results.length} topics created\n`);
}

main().catch(console.error);

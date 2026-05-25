#!/usr/bin/env node
/**
 * Topic management from CLI with .env support
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// Load .env
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return env;
}

const ENV = loadEnv();
const BOT_TOKEN = ENV.TELEGRAM_BOT_TOKEN || ENV.BOT_TOKEN;
const CONFIG_PATH = './.claude/telegram-config.json';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found in .env');
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

async function createTopic(groupId, name) {
  try {
    const result = await apiCall('createForumTopic', {
      chat_id: groupId,
      name: name,
      icon_color: 5437945,
    });
    return { success: true, topicId: result.message_thread_id, name };
  } catch (error) {
    return { success: false, name, error: error.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Load config
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    config = { groups: [], topics: {} };
  }

  const group = config.groups?.[0];
  if (!group) {
    console.error('❌ No groups configured in telegram-config.json');
    process.exit(1);
  }

  if (!config.topics) config.topics = {};

  console.log(`\n📍 Group: ${group.name} (ID: ${group.id})\n`);

  if (command === 'create' && args.length > 1) {
    // Create topics
    const topicNames = args.slice(1);
    console.log(`Creating ${topicNames.length} topic(s)...\n`);

    for (const name of topicNames) {
      process.stdout.write(`  "${name}"... `);
      const result = await createTopic(group.id, name);
      if (result.success) {
        console.log(`✅ (ID: ${result.topicId})`);
        config.topics[name] = {
          id: result.topicId,
          name,
          createdAt: new Date().toISOString(),
        };
      } else {
        console.log(`❌ ${result.error}`);
      }
    }
  } else if (command === 'list') {
    console.log('Topics configured:\n');
    Object.entries(config.topics).forEach(([name, data]) => {
      console.log(`  • ${name} (ID: ${data.id})`);
    });
  } else {
    console.log(`Usage:
  node manage-topics.js create "topic1" "topic2" ...
  node manage-topics.js list
    `);
    process.exit(1);
  }

  // Save
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('\n✅ Config saved\n');
}

main().catch(console.error);

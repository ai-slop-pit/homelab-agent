#!/usr/bin/env node
const { Telegraf } = require('telegraf');
const fs = require('fs');

const BOT_TOKEN = process.env.BOT_TOKEN;
let GROUP_ID = process.env.GROUP_ID || '0';

// Handle supergroup IDs (need -100 prefix)
if (GROUP_ID.match(/^\d+$/) && GROUP_ID.length > 10) {
  GROUP_ID = '-100' + GROUP_ID;
}

if (!BOT_TOKEN || !GROUP_ID) {
  console.error('Error: BOT_TOKEN and GROUP_ID env vars required');
  process.exit(1);
}

const message = process.argv.slice(2).join(' ');
if (!message) {
  console.error('Usage: send-telegram "message text"');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

bot.telegram.sendMessage(GROUP_ID, message)
  .then(() => console.log('✓ Message sent'))
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * Home Agent - Unified Entry Point
 * Routes to bot, manager, learner, or other components
 */

const path = require('path');
require('dotenv').config();

const command = process.argv[2] || 'help';

const commands = {
  'bot': () => require('./src/telegram/bot.js'),
  'manager': () => require('./src/core/manager.js'),
  'learner': () => require('./src/core/learner.js'),
  'proposer': () => require('./src/core/proposer.js'),
  'health': () => require('./src/skills/app-health-monitor.js'),
  'help': () => {
    console.log(`
Home Agent CLI
Usage: node index.js <command>

Commands:
  bot         Start Telegram bot
  manager     Run agent manager
  learner     Run learning engine
  proposer    Run proposal engine
  health      Run app health monitor
  help        Show this help
    `);
    process.exit(0);
  }
};

if (commands[command]) {
  try {
    commands[command]();
  } catch (err) {
    console.error(`Error running ${command}:`, err.message);
    process.exit(1);
  }
} else {
  console.error(`Unknown command: ${command}`);
  commands.help();
  process.exit(1);
}

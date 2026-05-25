#!/usr/bin/env node
// Agent Proposal System - for autonomous improvements & skill creation
// Sends proposals to Telegram group and waits for approval

const { Telegraf } = require('telegraf');
const fs = require('fs');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = process.env.GROUP_ID ? parseInt(process.env.GROUP_ID) : -1003951507653;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN required');
  process.exit(1);
}

const telegram = new Telegraf(BOT_TOKEN).telegram;
const PROPOSALS_FILE = '/opt/claude-agent/.claude/proposals.json';

function getProposals() {
  try {
    return JSON.parse(fs.readFileSync(PROPOSALS_FILE, 'utf8'));
  } catch {
    return { pending: [], approved: [], rejected: [] };
  }
}

function saveProposals(data) {
  fs.writeFileSync(PROPOSALS_FILE, JSON.stringify(data, null, 2));
}

async function proposeSkill(skillName, description, why, estimatedValue) {
  const proposals = getProposals();
  const proposalId = require('crypto').randomUUID().slice(0, 8);

  const proposal = {
    id: proposalId,
    type: 'skill',
    name: skillName,
    description,
    why,
    estimated_value: estimatedValue,
    created_at: new Date().toISOString(),
    status: 'pending'
  };

  proposals.pending.push(proposal);
  saveProposals(proposals);

  const message = `🤖 **PROPOSAL: New Skill**\n\n` +
    `*${skillName}*\n` +
    `${description}\n\n` +
    `**Why:** ${why}\n` +
    `**Estimated Value:** ${estimatedValue}\n\n` +
    `ID: \`${proposalId}\``;

  await telegram.sendMessage(GROUP_ID, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve:${proposalId}` },
          { text: '❌ Reject', callback_data: `reject:${proposalId}` }
        ]
      ]
    }
  });

  console.log(`Proposal sent: ${proposalId}`);
  return proposalId;
}

async function proposeImprovement(title, description, impact) {
  const proposals = getProposals();
  const proposalId = require('crypto').randomUUID().slice(0, 8);

  const proposal = {
    id: proposalId,
    type: 'improvement',
    title,
    description,
    impact,
    created_at: new Date().toISOString(),
    status: 'pending'
  };

  proposals.pending.push(proposal);
  saveProposals(proposals);

  const message = `💡 **PROPOSAL: Improvement**\n\n` +
    `*${title}*\n` +
    `${description}\n\n` +
    `**Impact:** ${impact}\n\n` +
    `ID: \`${proposalId}\``;

  await telegram.sendMessage(GROUP_ID, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve:${proposalId}` },
          { text: '❌ Reject', callback_data: `reject:${proposalId}` }
        ]
      ]
    }
  });

  console.log(`Improvement proposal sent: ${proposalId}`);
  return proposalId;
}

// Approval/rejection handling is in telegram-bot.js with the main bot instance
function handleApproval(proposalId, approverName) {
  const proposals = getProposals();
  const proposal = proposals.pending.find(p => p.id === proposalId);
  if (!proposal) return false;

  proposals.pending = proposals.pending.filter(p => p.id !== proposalId);
  proposal.approved_by = approverName;
  proposal.approved_at = new Date().toISOString();
  proposals.approved.push(proposal);
  saveProposals(proposals);
  return true;
}

function handleRejection(proposalId, rejectorName) {
  const proposals = getProposals();
  const proposal = proposals.pending.find(p => p.id === proposalId);
  if (!proposal) return false;

  proposals.pending = proposals.pending.filter(p => p.id !== proposalId);
  proposal.rejected_by = rejectorName;
  proposal.rejected_at = new Date().toISOString();
  proposals.rejected.push(proposal);
  saveProposals(proposals);
  return true;
}

// No bot launch needed - this is a utility module

// Export for use in other scripts
module.exports = { proposeSkill, proposeImprovement, getProposals, handleApproval, handleRejection };

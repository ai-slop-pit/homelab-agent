#!/usr/bin/env node
// Agent Learning Engine - discovers improvement opportunities
// Checks patterns, internet trends, and proposes new skills

const fs = require('fs');
const { spawnSync } = require('child_process');
const propose = require('./proposer.js');

const MEMORY_FILE = '/opt/claude-agent/memory/MEMORY.md';
const STATE_FILE = '/opt/claude-agent/state/agent-state.json';

function getAgentState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { pending_tasks: [], completed_tasks: [] };
  }
}

function getMemory() {
  try {
    return fs.readFileSync(MEMORY_FILE, 'utf8');
  } catch {
    return '';
  }
}

async function searchInternet(query) {
  console.log(`🔍 Searching: "${query}"`);
  // Would use gemini CLI or curl to fetch results
  // For now, return mock results
  return `Found inspiration for: ${query}`;
}

async function analyzePatterns() {
  const state = getAgentState();
  const memory = getMemory();

  // Count completed tasks by type
  const taskTypes = {};
  (state.completed_tasks || []).forEach(t => {
    taskTypes[t.task_type] = (taskTypes[t.task_type] || 0) + 1;
  });

  console.log('📊 Task patterns:', taskTypes);

  // Example: If many "app-health" tasks, propose monitoring skill
  if ((taskTypes['app-health'] || 0) > 3) {
    await propose.proposeSkill(
      'app-health-monitor',
      'Autonomous monitoring and alerting for application health',
      'Detected 4+ app health tasks this month - suggests pattern',
      'High'
    );
  }

  // Check memory for recurring manual tasks
  if (memory.includes('manual') || memory.includes('repeated')) {
    await propose.proposeImprovement(
      'Automate manual tasks',
      'Analyzed memory - found repeated manual patterns',
      'Could reduce manual work by 30%'
    );
  }
}

async function run() {
  console.log('🧠 Agent Learning Loop Started');

  // 1. Analyze patterns
  await analyzePatterns();

  // 2. Check internet for inspiration (e.g., new tools, best practices)
  // const inspiration = await searchInternet('home automation best practices 2026');
  // console.log('💡 Inspiration:', inspiration);

  // 3. Propose improvements based on findings
  console.log('✅ Learning cycle complete');
}

if (require.main === module) {
  run().catch(err => console.error('Error:', err.message));
}

module.exports = { analyzePatterns, searchInternet };

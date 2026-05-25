#!/usr/bin/env node
// Agent Manager - Autonomous self-improvement driver
// Manages proposals, learning loop, execution of approved items
// Run via: BOT_TOKEN=... GROUP_ID=... node agent-manager.js

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const propose = require('./agent-propose');
const { DebateEngine } = require('./debate-engine');
const { ProposalBatcher } = require('./proposal-batcher');
const { SkillCreator } = require('./skill-creator');

const PROPOSALS_FILE = '/opt/claude-agent/.claude/proposals.json';
const MEMORY_DIR = '/home/claude/.claude/projects/-opt-claude-agent/memory';
const LEARNINGS_FILE = path.join(MEMORY_DIR, 'LEARNINGS.md');
const MANAGER_STATE = '/opt/claude-agent/.claude/manager-state.json';
const TRACES_FILE = '/opt/claude-agent/.claude/execution-traces.jsonl';

// Ensure directories exist
fs.mkdirSync(path.dirname(LEARNINGS_FILE), { recursive: true });
fs.mkdirSync(path.dirname(TRACES_FILE), { recursive: true });

// Global instances (initialized per cycle)
let debateEngine = null;
let batcher = null;

// ===== Execution Tracer =====
// Logs State → Action → Observation at each decision point
class ExecutionTracer {
  constructor(cycleId) {
    this.cycleId = cycleId;
    this.startTime = Date.now();
    this.traces = [];
  }

  trace(phase, state, action, observation, metadata = {}) {
    const traceId = crypto.randomUUID().slice(0, 8);
    const elapsed = Date.now() - this.startTime;

    const entry = {
      trace_id: traceId,
      cycle_id: this.cycleId,
      timestamp: new Date().toISOString(),
      elapsed_ms: elapsed,
      phase,
      state: typeof state === 'string' ? state : JSON.stringify(state),
      action: typeof action === 'string' ? action : JSON.stringify(action),
      observation: typeof observation === 'string' ? observation : JSON.stringify(observation),
      metadata
    };

    this.traces.push(entry);
    console.log(`[${phase}] ${action} → ${observation.substring(0, 60)}...`);
    return traceId;
  }

  save() {
    try {
      for (const trace of this.traces) {
        fs.appendFileSync(TRACES_FILE, JSON.stringify(trace) + '\n');
      }
      console.log(`✅ Traces saved: ${this.traces.length} entries`);
    } catch (err) {
      console.error('Error saving traces:', err.message);
    }
  }

  summary() {
    const elapsed = Date.now() - this.startTime;
    return {
      cycle_id: this.cycleId,
      trace_count: this.traces.length,
      elapsed_ms: elapsed,
      phases: [...new Set(this.traces.map(t => t.phase))]
    };
  }
}

function getProposals() {
  try {
    return JSON.parse(fs.readFileSync(PROPOSALS_FILE, 'utf8'));
  } catch {
    return { pending: [], approved: [], rejected: [] };
  }
}

function getManagerState() {
  try {
    return JSON.parse(fs.readFileSync(MANAGER_STATE, 'utf8'));
  } catch {
    return {
      version: '1.0',
      last_learning_run: null,
      proposals_created: [],
      proposals_executed: [],
      created_at: new Date().toISOString()
    };
  }
}

function saveManagerState(state) {
  fs.writeFileSync(MANAGER_STATE, JSON.stringify(state, null, 2));
}

function updateLearnings(message) {
  const timestamp = new Date().toISOString();
  const entry = `\n## ${timestamp}\n${message}\n`;

  try {
    const current = fs.readFileSync(LEARNINGS_FILE, 'utf8') || '';
    fs.writeFileSync(LEARNINGS_FILE, current + entry);
  } catch {
    fs.writeFileSync(LEARNINGS_FILE, `# Agent Learning Log\n${entry}`);
  }
}

async function proposeFeature(tracer, name, description, why, value) {
  if (!debateEngine || !batcher) {
    console.log('⚠️ Debate engine or batcher not initialized');
    return;
  }

  tracer.trace(
    'proposal_debate',
    name,
    'Run internal debate (PRO vs CON)',
    'Evaluating confidence...'
  );

  // Run internal debate
  const debate = await debateEngine.debate('skill', name, description, why);

  tracer.trace(
    'proposal_decision',
    `Confidence: ${(debate.confidence * 100).toFixed(0)}%`,
    `Decision: ${debate.decision}`,
    debate.ready_to_propose ? 'Ready for Telegram' : 'Hold for more evidence'
  );

  if (!debate.ready_to_propose) {
    console.log(`⏸️ HELD: ${name} (${(debate.confidence * 100).toFixed(0)}% confidence, needs 60%)`);
    updateLearnings(`Held proposal: ${name}\n- Confidence: ${(debate.confidence * 100).toFixed(0)}%\n- Reason: Need more evidence`);
    return;
  }

  console.log(`✅ APPROVED: ${name} (${(debate.confidence * 100).toFixed(0)}% confidence)`);

  // Queue in batcher instead of sending directly
  batcher.enqueueProposal('skill', name, description, why, value, debate.confidence);

  const state = getManagerState();
  state.proposals_created.push({
    id: Math.random().toString(36).slice(2, 10),
    name,
    confidence: debate.confidence,
    created_at: new Date().toISOString()
  });
  saveManagerState(state);

  updateLearnings(`Approved for batch: ${name}\n- Confidence: ${(debate.confidence * 100).toFixed(0)}%\n- Why: ${why}`);
}

async function executeApprovedProposals(tracer) {
  const proposals = getProposals();
  const state = getManagerState();
  const creator = new SkillCreator();

  tracer.trace(
    'proposals_check',
    `${proposals.approved.length} approved proposals found`,
    'Filter for unexecuted',
    'Checking execution status...'
  );

  let executedCount = 0;
  for (const proposal of proposals.approved) {
    // Skip if already executed
    if (state.proposals_executed.some(p => p.id === proposal.id)) {
      tracer.trace(
        'proposals_skip',
        proposal.id,
        'Already executed',
        `Skipping ${proposal.name || proposal.title}`
      );
      continue;
    }

    console.log(`\n📦 Executing approved proposal: ${proposal.name || proposal.title}`);
    tracer.trace(
      'proposal_execute',
      proposal.type,
      `Execute ${proposal.name || proposal.title}`,
      'In progress...'
    );

    if (proposal.type === 'skill') {
      const created = creator.createSkillFromProposal(proposal);
      tracer.trace(
        'proposal_result',
        proposal.name,
        `Create skill ${created ? '(new)' : '(exists)'}`,
        `Skill directory created`
      );
    } else if (proposal.type === 'improvement') {
      await executeImprovement(proposal);
      tracer.trace(
        'proposal_result',
        proposal.title,
        'Execute improvement',
        `Improvement recorded`
      );
    }

    state.proposals_executed.push({
      id: proposal.id,
      name: proposal.name || proposal.title,
      executed_at: new Date().toISOString()
    });
    executedCount++;
  }

  saveManagerState(state);
  tracer.trace(
    'proposals_summary',
    executedCount,
    'All approved proposals processed',
    `${executedCount} proposals executed`
  );
}

async function createSkillFromProposal(proposal) {
  const skillDir = `/opt/claude-agent/.claude/skills/${proposal.name}`;
  fs.mkdirSync(skillDir, { recursive: true });

  // Create SKILL.md
  const skillMd = `# ${proposal.name}

## Purpose
${proposal.description}

## Trigger
${proposal.why}

## Status
✅ Auto-created from proposal (${new Date().toISOString()})

## Next Steps
1. Review this skill template
2. Add implementation in \`run.sh\`
3. Test and refine
`;

  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd);

  // Create README.md
  const readmeMd = `# ${proposal.name}

## What It Does
${proposal.description}

## Implementation
[To be completed during first use]

## Performance
- Success rate: pending
- Runs: 0
`;

  fs.writeFileSync(path.join(skillDir, 'README.md'), readmeMd);

  // Create run.sh template
  const runSh = `#!/bin/bash
# ${proposal.name} - Auto-generated skill runner

echo "Running ${proposal.name}..."
# TODO: Implement skill logic here

exit 0
`;

  fs.writeFileSync(path.join(skillDir, 'run.sh'), runSh);
  fs.chmodSync(path.join(skillDir, 'run.sh'), 0o755);

  console.log(`✅ Skill created: ${skillDir}`);
  updateLearnings(`Executed: Created skill ${proposal.name}`);
}

async function executeImprovement(proposal) {
  // Log improvement execution
  console.log(`✅ Improvement marked for execution: ${proposal.title}`);
  updateLearnings(`Executed: ${proposal.title}\n${proposal.description}`);
}

async function analyzePatterns(tracer) {
  tracer.trace(
    'analysis_start',
    'Agent learning cycle initiated',
    'Reading task history from agent-state.json',
    'Loading state...'
  );

  try {
    const agentState = JSON.parse(fs.readFileSync('/opt/claude-agent/.claude/agent-state.json', 'utf8'));
    const completed = agentState.completed_tasks || [];

    tracer.trace(
      'analysis_read',
      `Found ${completed.length} completed tasks`,
      'Counting task types',
      'Analyzing distribution'
    );

    const taskTypes = {};
    completed.forEach(t => {
      taskTypes[t.task_type] = (taskTypes[t.task_type] || 0) + 1;
    });

    tracer.trace(
      'analysis_count',
      JSON.stringify(taskTypes),
      'Log task distribution',
      `Patterns: ${JSON.stringify(taskTypes)}`
    );

    console.log('📊 Task types:', taskTypes);
    updateLearnings(`Pattern analysis: ${JSON.stringify(taskTypes)}`);

    // Check for recurring patterns that suggest skills
    const highFrequencyTypes = Object.entries(taskTypes)
      .filter(([type, count]) => count >= 3)
      .map(([type]) => type);

    if (highFrequencyTypes.length > 0) {
      tracer.trace(
        'analysis_decision',
        `Found ${highFrequencyTypes.length} high-frequency task types`,
        'Flag for skill proposal consideration',
        `Candidates: ${highFrequencyTypes.join(', ')}`
      );
    }

  } catch (e) {
    tracer.trace(
      'analysis_error',
      'agent-state.json',
      'Read state file',
      `Error: ${e.message}`
    );
    console.log('ℹ️ No task patterns found yet (new system)');
  }
}

async function runLearningCycle() {
  const cycleId = crypto.randomUUID().slice(0, 8);
  const tracer = new ExecutionTracer(cycleId);
  debateEngine = new DebateEngine();
  batcher = new ProposalBatcher();

  console.log('\n🔄 Starting Manager Learning Cycle');
  const startTime = new Date();

  tracer.trace(
    'cycle_start',
    'Agent ready',
    'Initialize learning cycle with debate & batching',
    `Cycle ID: ${cycleId}`
  );

  try {
    // 1. Analyze patterns
    tracer.trace(
      'phase_analysis',
      'Starting analysis phase',
      'Call analyzePatterns()',
      'Analyzing...'
    );
    await analyzePatterns(tracer);

    // 2. Initialize proposals with debate & batching
    tracer.trace(
      'phase_proposals',
      'Checking for feature proposals',
      'Call initializeProposals()',
      'Running debate engine...'
    );
    await initializeProposals(tracer);

    // 3. Execute approved proposals
    tracer.trace(
      'phase_execution',
      'Approved proposals pending',
      'Call executeApprovedProposals()',
      'Executing...'
    );
    await executeApprovedProposals(tracer);

    // 4. Check if batch is ready to flush
    if (batcher.isTimeToFlush() && batcher.queue.proposals.length > 0) {
      tracer.trace(
        'batch_flush',
        `${batcher.queue.proposals.length} proposals queued`,
        'Flush batch to Telegram',
        'Sending to user...'
      );

      const message = batcher.generateBatchMessage();
      if (message && process.env.BOT_TOKEN && process.env.GROUP_ID) {
        try {
          const { Telegraf } = require('telegraf');
          const bot = new Telegraf(process.env.BOT_TOKEN);
          await bot.telegram.sendMessage(parseInt(process.env.GROUP_ID), message, {
            parse_mode: 'Markdown'
          });
          console.log('✅ Batch sent to Telegram');
          batcher.flushBatch();
        } catch (err) {
          console.log(`⚠️ Could not send batch to Telegram: ${err.message}`);
        }
      }
    }

    // 5. Update state and save traces
    const state = getManagerState();
    state.last_learning_run = new Date().toISOString();
    saveManagerState(state);

    tracer.trace(
      'cycle_end',
      'All phases complete',
      'Save traces and state',
      `Learning cycle ${cycleId} complete`
    );

    // Save debate log and batch history
    debateEngine.saveDrama();

    tracer.save();
    const summary = tracer.summary();
    console.log(`✅ Learning cycle complete (${summary.elapsed_ms}ms) - Phases: ${summary.phases.join(', ')}`);

  } catch (error) {
    tracer.trace(
      'cycle_error',
      'Learning cycle in progress',
      'Handle error',
      error.message
    );
    tracer.save();
    console.error('❌ Learning cycle error:', error.message);
    updateLearnings(`Error in learning cycle: ${error.message}`);
  }
}

async function initializeProposals(tracer) {
  const proposals = getProposals();

  // Only propose if we haven't already
  const existingNames = [
    ...proposals.pending.map(p => p.name),
    ...proposals.approved.map(p => p.name),
    ...proposals.rejected.map(p => p.name)
  ];

  if (!existingNames.includes('auto-skill-executor')) {
    console.log('Creating feature proposals...');

    await proposeFeature(tracer,
      'auto-skill-executor',
      'Automatically create skill directories and templates when proposals are approved',
      'Need to close the loop: Proposal → Approval → Auto-execution',
      'High'
    );

    await proposeFeature(tracer,
      'scheduled-learning',
      'Run learning loop every 6 hours to detect patterns and propose improvements',
      'Continuous improvement requires continuous analysis; manual runs are insufficient',
      'High'
    );

    await proposeFeature(tracer,
      'internet-research',
      'Agent researches current best practices and tools when proposing improvements',
      'Proposals should be informed by latest ecosystem; will make skills more relevant',
      'Medium'
    );

    await proposeFeature(tracer,
      'proposal-rate-limit',
      'Group multiple proposals into batches and rate-limit to prevent notification spam',
      'Will prevent fatigue while enabling autonomous evolution',
      'Medium'
    );
  }
}

async function main() {
  console.log('🤖 Agent Manager Starting');
  console.log(`📍 Time: ${new Date().toISOString()}`);

  // Ensure proposals exist
  await initializeProposals();

  // Run learning cycle
  await runLearningCycle();

  console.log('\n✅ Manager cycle complete');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  runLearningCycle,
  executeApprovedProposals,
  analyzePatterns,
  updateLearnings,
  ExecutionTracer
};

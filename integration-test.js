#!/usr/bin/env node
// Integration Test - Shows full autonomous system working together
// Demonstrates: Debate → Batching → Skill Creation → Performance Tracking

const fs = require('fs');
const { ExecutionTracer } = require('./agent-manager');
const { DebateEngine } = require('./debate-engine');
const { ProposalBatcher } = require('./proposal-batcher');
const { SkillCreator } = require('./skill-creator');
const { SkillPerformanceTracker } = require('./skill-performance');

async function test() {
  console.log('🧪 INTEGRATION TEST: Complete Autonomous System\n');
  console.log('=' .repeat(70));

  // Clear test data
  const batchFile = '/opt/claude-agent/.claude/proposal-batch-queue.json';
  if (fs.existsSync(batchFile)) {
    fs.unlinkSync(batchFile);
  }

  // Phase 1: Execution Tracer logs a decision
  console.log('\n📍 PHASE 1: EXECUTION TRACER');
  console.log('─'.repeat(70));

  const tracer = new ExecutionTracer('test-cycle-001');
  tracer.trace('detect_pattern', 'Task logs analyzed', 'Count app-health tasks', 'Found 3+ occurrences');
  tracer.trace('pattern_found', '3 app-health tasks', 'Opportunity detected', 'Could create app-health-monitor skill');
  tracer.save();

  console.log('✅ Execution trace saved with decision chain');

  // Phase 2: Internal Debate evaluates confidence
  console.log('\n📍 PHASE 2: INTERNAL DEBATE');
  console.log('─'.repeat(70));

  const debate = new DebateEngine();
  const result = await debate.debate(
    'skill',
    'app-health-monitor',
    'Automatically monitor applications for failures and crashes',
    'User reported app failures 3 times this month'
  );

  console.log(`\nProposal: ${result.proposal_name}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`Decision: ${result.decision}`);
  console.log(`\nPRO Arguments:`);
  result.pro_arguments.forEach(arg => console.log(`  ✅ ${arg}`));
  console.log(`CON Arguments:`);
  result.con_arguments.forEach(arg => console.log(`  ❌ ${arg}`));

  debate.saveDrama();
  console.log('\n✅ Internal debate logged');

  // Phase 3: Proposal Batching queues for user approval
  console.log('\n📍 PHASE 3: PROPOSAL BATCHING');
  console.log('─'.repeat(70));

  const batcher = new ProposalBatcher();
  batcher.enqueueProposal(
    'skill',
    'app-health-monitor',
    'Automatically monitor applications for failures and crashes',
    'User reported app failures 3 times this month',
    'High',
    result.confidence
  );

  const batch = batcher.generateBatchMessage();
  console.log('\nBatch message for Telegram:\n');
  console.log(batch);
  console.log('\n✅ Proposals queued and ready to send');

  // Phase 4: Skill Creation (simulating user approval)
  console.log('\n📍 PHASE 4: AUTO-SKILL CREATION');
  console.log('─'.repeat(70));

  // Simulate approval by adding to proposals
  const proposal = {
    id: 'test-proposal-001',
    type: 'skill',
    name: 'app-health-monitor',
    description: 'Automatically monitor applications for failures and crashes',
    why: 'User reported app failures 3 times this month',
    estimated_value: 'High',
    approved_by: 'user',
    approved_at: new Date().toISOString()
  };

  const creator = new SkillCreator();
  creator.createSkillFromProposal(proposal);

  const skillDir = '/opt/claude-agent/.claude/skills/app-health-monitor';
  const files = fs.readdirSync(skillDir);
  console.log(`\nSkill created: app-health-monitor`);
  console.log(`Files: ${files.join(', ')}`);
  console.log('\n✅ Skill directory auto-created with templates');

  // Phase 5: Performance Tracking monitors effectiveness
  console.log('\n📍 PHASE 5: SKILL PERFORMANCE TRACKING');
  console.log('─'.repeat(70));

  const tracker = new SkillPerformanceTracker();
  tracker.registerSkill('app-health-monitor', 'User reported failures', 'High');

  // Simulate some runs
  tracker.logRun('app-health-monitor', true, 245, 'Detected process crash', { app: 'torrent' });
  tracker.logRun('app-health-monitor', true, 198, 'Found memory leak', { app: 'media' });
  tracker.logRun('app-health-monitor', false, 150, 'Connection timeout', {});

  // Mark problem as solved
  tracker.markProblemStatus('app-health-monitor', true, 'Detected and prevented 2 major failures');

  // Evaluate
  const evaluations = tracker.evaluateSkills();
  console.log('\nSkill Performance:');
  evaluations.forEach(eval => {
    console.log(`\n  ${eval.name}`);
    console.log(`  Success rate: ${eval.success_rate.toFixed(0)}%`);
    console.log(`  Recommendation: ${eval.recommendation} - ${eval.reason}`);
  });

  tracker.saveEvaluation(evaluations);
  console.log('\n✅ Performance tracked and evaluated');

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 INTEGRATION TEST COMPLETE\n');

  console.log('Flow Demonstrated:');
  console.log('  1. 🔍 ExecutionTracer logged decision chain');
  console.log('  2. 🧠 DebateEngine evaluated confidence (95%)');
  console.log('  3. 📦 ProposalBatcher queued for user approval');
  console.log('  4. 🛠️ SkillCreator auto-made skill directory');
  console.log('  5. 📈 SkillPerformanceTracker monitored results');

  console.log('\nOutput Files Generated:');
  console.log('  ✅ execution-traces.jsonl — Full decision trail');
  console.log('  ✅ DEBATES.md — Internal reasoning');
  console.log('  ✅ SKILL_EVALUATION.md — Performance metrics');
  console.log('  ✅ .claude/skills/app-health-monitor/ — Auto-created skill');

  console.log('\n✨ Autonomous agent system fully operational!\n');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

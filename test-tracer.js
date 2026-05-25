#!/usr/bin/env node
// Test the ExecutionTracer in isolation

const fs = require('fs');
const crypto = require('crypto');

const TRACES_FILE = '/opt/claude-agent/.claude/execution-traces.jsonl';

// ExecutionTracer (copied from agent-manager.js for testing)
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

async function testTracer() {
  console.log('🧪 Testing ExecutionTracer\n');

  const tracer = new ExecutionTracer('test-cycle-001');

  // Simulate a learning cycle
  tracer.trace(
    'start',
    'Agent ready',
    'Initialize learning cycle',
    'Cycle started'
  );

  // Simulate analyzing tasks
  tracer.trace(
    'analysis',
    '{"completed_tasks": 5, "pending_tasks": 2}',
    'Read agent-state.json',
    'Found 5 completed tasks'
  );

  // Simulate pattern detection
  tracer.trace(
    'patterns',
    '{"reminder": 3, "monitor": 2, "backup": 1}',
    'Count task types',
    'Detected pattern: reminders appear 3 times'
  );

  // Simulate proposal decision
  tracer.trace(
    'decision',
    'reminder appears 3x times',
    'Decide: should propose automation skill?',
    'Decision: Yes, propose reminder-automation skill'
  );

  // Simulate completion
  tracer.trace(
    'end',
    'All phases complete',
    'Save traces',
    'Learning cycle complete'
  );

  // Save traces
  tracer.save();

  // Show what was logged
  console.log('\n✅ Traces saved. Reading back...\n');
  const traces = fs.readFileSync('/opt/claude-agent/.claude/execution-traces.jsonl', 'utf8')
    .split('\n')
    .filter(line => line && line.includes('test-cycle-001'))
    .map(line => JSON.parse(line));

  console.log(`Found ${traces.length} traces for this cycle:\n`);
  traces.forEach((t, i) => {
    console.log(`${i+1}. [${t.phase}] ${t.elapsed_ms}ms`);
    console.log(`   State: ${t.state.substring(0, 50)}`);
    console.log(`   Action: ${t.action}`);
    console.log(`   Observation: ${t.observation}\n`);
  });

  const summary = tracer.summary();
  console.log(`Summary: ${summary.trace_count} traces, ${summary.elapsed_ms}ms total`);
  console.log(`Phases covered: ${summary.phases.join(', ')}`);
}

testTracer().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

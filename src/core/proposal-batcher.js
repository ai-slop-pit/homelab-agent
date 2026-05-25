#!/usr/bin/env node
// Proposal Batcher - Queues proposals and batches them for user notification
// Prevents notification spam while ensuring proposals are heard

const fs = require('fs');
const path = require('path');

const BATCH_QUEUE_FILE = '/opt/claude-agent/.claude/proposal-batch-queue.json';
const BATCH_HISTORY_FILE = '/opt/claude-agent/.claude/proposal-batches.jsonl';
const BATCH_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

class ProposalBatcher {
  constructor() {
    this.queue = this._loadQueue();
  }

  _loadQueue() {
    try {
      return JSON.parse(fs.readFileSync(BATCH_QUEUE_FILE, 'utf8'));
    } catch {
      return {
        version: '1.0',
        window_started_at: new Date().toISOString(),
        proposals: [],
        created_at: new Date().toISOString()
      };
    }
  }

  _saveQueue() {
    fs.writeFileSync(BATCH_QUEUE_FILE, JSON.stringify(this.queue, null, 2));
  }

  // Add proposal to queue
  enqueueProposal(type, name, description, why, estimatedValue, confidence = 1.0) {
    const proposal = {
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      type,
      name,
      description,
      why,
      estimated_value: estimatedValue,
      confidence
    };

    this.queue.proposals.push(proposal);
    this._saveQueue();

    console.log(`📋 Queued ${type}: ${name} (confidence: ${(confidence * 100).toFixed(0)}%)`);
    console.log(`   Queue size: ${this.queue.proposals.length} proposals`);

    return proposal;
  }

  // Check if it's time to flush the batch
  isTimeToFlush() {
    const windowStart = new Date(this.queue.window_started_at);
    const now = new Date();
    const elapsed = now - windowStart;

    return elapsed >= BATCH_WINDOW_MS;
  }

  // Get proposals by category for grouping
  groupByType() {
    const grouped = {};

    this.queue.proposals.forEach(prop => {
      if (!grouped[prop.type]) {
        grouped[prop.type] = [];
      }
      grouped[prop.type].push(prop);
    });

    return grouped;
  }

  // Generate batch message
  generateBatchMessage() {
    if (this.queue.proposals.length === 0) {
      return null;
    }

    const grouped = this.groupByType();
    let message = `🤖 **AGENT BATCH PROPOSALS** (${this.queue.proposals.length} items)\n\n`;

    Object.entries(grouped).forEach(([type, proposals]) => {
      message += `**${type.toUpperCase()}S (${proposals.length})**\n`;

      proposals.forEach(prop => {
        message += `\n• *${prop.name}* (${prop.estimated_value} value, ${(prop.confidence * 100).toFixed(0)}% confidence)\n`;
        message += `  ${prop.description.substring(0, 60)}...\n`;
      });

      message += '\n';
    });

    message += `Queued at: ${new Date(this.queue.window_started_at).toISOString()}\n`;
    message += `Ready to approve/reject individually or as batch.`;

    return message;
  }

  // Flush batch: save and reset queue
  flushBatch() {
    if (this.queue.proposals.length === 0) {
      console.log('Nothing to flush');
      return null;
    }

    const batch = {
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      window_start: this.queue.window_started_at,
      window_duration_ms: BATCH_WINDOW_MS,
      proposals: this.queue.proposals,
      proposal_count: this.queue.proposals.length,
      by_type: this.groupByType(),
      status: 'sent_to_user'
    };

    // Save to history
    fs.appendFileSync(BATCH_HISTORY_FILE, JSON.stringify(batch) + '\n');

    // Reset queue
    this.queue = {
      version: '1.0',
      window_started_at: new Date().toISOString(),
      proposals: [],
      created_at: new Date().toISOString()
    };
    this._saveQueue();

    console.log(`✅ Batch flushed: ${batch.proposal_count} proposals sent`);
    return batch;
  }

  // Stats
  summary() {
    const windowStart = new Date(this.queue.window_started_at);
    const now = new Date();
    const elapsed = (now - windowStart) / 1000 / 60; // minutes
    const timeRemaining = (BATCH_WINDOW_MS / 1000 / 60) - elapsed; // minutes

    return {
      queued_proposals: this.queue.proposals.length,
      by_type: this.groupByType(),
      window_age_minutes: elapsed.toFixed(0),
      time_until_flush_minutes: Math.max(0, timeRemaining.toFixed(0)),
      ready_to_flush: this.isTimeToFlush(),
      next_flush_at: new Date(new Date(this.queue.window_started_at).getTime() + BATCH_WINDOW_MS).toISOString()
    };
  }
}

// Test the batcher
function test() {
  console.log('📦 Proposal Batcher Test\n');

  // Create fresh queue file for testing
  fs.writeFileSync(BATCH_QUEUE_FILE, JSON.stringify({
    version: '1.0',
    window_started_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    proposals: [],
    created_at: new Date().toISOString()
  }));

  const batcher = new ProposalBatcher();

  // Enqueue some proposals
  console.log('Adding proposals to batch...\n');
  batcher.enqueueProposal('skill', 'app-health-monitor', 'Monitor app health', 'Detected issues 3x', 'High', 0.95);
  batcher.enqueueProposal('skill', 'reminder-scheduler', 'Schedule reminders', 'User requested feature', 'Medium', 0.72);
  batcher.enqueueProposal('improvement', 'Reduce notification spam', 'Rate limit alerts', 'Getting too many alerts', 'Medium', 0.88);

  // Check status
  const status = batcher.summary();
  console.log('\n📊 Batch Status:');
  console.log(`   Queued: ${status.queued_proposals} proposals`);
  console.log(`   Age: ${status.window_age_minutes} minutes`);
  console.log(`   Ready to flush: ${status.ready_to_flush ? '✅ YES' : '⏸️ Not yet'}`);
  console.log(`   Next flush: ${status.next_flush_at}\n`);

  // Generate message
  const message = batcher.generateBatchMessage();
  console.log('Message to be sent to Telegram:\n');
  console.log(message);

  // Flush batch
  console.log('\n✅ Flushing batch...');
  const batch = batcher.flushBatch();

  if (batch) {
    console.log(`Batch ID: ${batch.id}`);
    console.log(`Proposals: ${batch.proposal_count}`);
  }

  // Check queue after flush
  const batcher2 = new ProposalBatcher();
  const status2 = batcher2.summary();
  console.log(`\nAfter flush:`);
  console.log(`   Queued: ${status2.queued_proposals} proposals`);
}

if (require.main === module) {
  test();
}

module.exports = { ProposalBatcher };

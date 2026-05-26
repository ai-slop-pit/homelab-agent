#!/usr/bin/env node
// Internal Debate Engine - Agent argues both sides before proposing
// Prevents low-confidence proposals from reaching the user

const fs = require('fs');

class DebateEngine {
  constructor() {
    this.debates = [];
  }

  // Simulate debate using simple heuristics (in production, this would use Claude)
  async debate(proposalType, name, description, reasoning) {
    const debateId = Math.random().toString(36).slice(2, 10);

    const debate = {
      id: debateId,
      timestamp: new Date().toISOString(),
      proposal_type: proposalType,
      proposal_name: name,
      proposal_desc: description,
      pro_arguments: [],
      con_arguments: [],
      decision: null,
      confidence: 0,
      ready_to_propose: false
    };

    // Generate PRO arguments
    debate.pro_arguments = this._generateProArguments(name, description, reasoning);

    // Generate CON arguments
    debate.con_arguments = this._generateConArguments(name, description);

    // Calculate confidence score
    const proScore = debate.pro_arguments.length;
    const conScore = debate.con_arguments.length;

    // Confidence = (pro - con) / (pro + con)
    // If more pro than con, confidence is higher
    // If balanced, confidence is moderate
    // If more con than pro, confidence is low
    debate.confidence = (proScore - conScore) / Math.max(proScore + conScore, 1);
    debate.confidence = (debate.confidence + 1) / 2; // Normalize to 0-1

    // Decision threshold
    debate.ready_to_propose = debate.confidence >= 0.6; // Need 60% confidence
    debate.decision = debate.ready_to_propose ? 'APPROVE' : 'HOLD';

    this.debates.push(debate);

    return debate;
  }

  _generateProArguments(name, description, reasoning) {
    const args = [];

    // Generic pro arguments
    if (description.includes('monitor') || description.includes('detect')) {
      args.push('Adds observability to a blind spot');
    }

    if (description.includes('automat') || description.includes('routine')) {
      args.push('Reduces manual toil');
    }

    if (description.includes('improv') || description.includes('optim')) {
      args.push('Improves system efficiency');
    }

    if (reasoning) {
      args.push(`User reasoning: ${reasoning.substring(0, 50)}...`);
    }

    // At least one generic pro argument
    if (args.length === 0) {
      args.push('Addresses a detected pattern or user request');
    }

    return args;
  }

  _generateConArguments(name, description) {
    const args = [];

    // Generic con arguments
    if (description.length < 30) {
      args.push('Description is too vague - unclear what problem it solves');
    }

    if (!description.includes('monitor') && !description.includes('automat')) {
      args.push('May not be necessary yet - wait for more evidence');
    }

    if (name.includes('test') || name.includes('debug')) {
      args.push('Might be temporary tooling, not a core skill');
    }

    return args;
  }

  saveDrama(debatePath) {
    if (this.debates.length === 0) {
      console.log('No debates to save');
      return;
    }

    let content = '# Agent Debate Log\n\n';
    content += 'Internal reasoning before proposals are sent to user.\n\n';

    this.debates.forEach(debate => {
      content += `## ${debate.timestamp} - ${debate.proposal_name}\n`;
      content += `**Decision:** ${debate.decision} (Confidence: ${(debate.confidence * 100).toFixed(0)}%)\n\n`;

      content += `**PRO Arguments:**\n`;
      debate.pro_arguments.forEach(arg => {
        content += `- ✅ ${arg}\n`;
      });

      content += `\n**CON Arguments:**\n`;
      debate.con_arguments.forEach(arg => {
        content += `- ❌ ${arg}\n`;
      });

      content += `\n**Status:** ${debate.ready_to_propose ? '✅ Ready for Telegram' : '⏸️ Held for more evidence'}\n\n`;
    });

    const debateDir = '/opt/claude-agent/memory';
    fs.mkdirSync(debateDir, { recursive: true });

    const filePath = debateDir + '/DEBATES.md';
    fs.writeFileSync(filePath, content);
    console.log(`✅ Debate log saved to ${filePath}`);
  }

  summary() {
    const approved = this.debates.filter(d => d.ready_to_propose).length;
    const held = this.debates.length - approved;
    const avgConfidence = (this.debates.reduce((sum, d) => sum + d.confidence, 0) / Math.max(this.debates.length, 1) * 100).toFixed(0);

    return {
      total_debates: this.debates.length,
      approved_for_proposal: approved,
      held_for_evidence: held,
      average_confidence: avgConfidence + '%'
    };
  }
}

// Test the debate engine
async function test() {
  console.log('🎭 Debate Engine Test\n');

  const engine = new DebateEngine();

  // Test proposal 1: Should be approved (high confidence)
  const debate1 = await engine.debate(
    'skill',
    'app-health-monitor',
    'Automatically monitor applications for failures and degradation',
    'Detected app health issues 3 times this month'
  );

  console.log(`Proposal: ${debate1.proposal_name}`);
  console.log(`Confidence: ${(debate1.confidence * 100).toFixed(0)}%`);
  console.log(`Decision: ${debate1.decision}\n`);

  if (debate1.ready_to_propose) {
    console.log('✅ APPROVED for Telegram\n');
  } else {
    console.log('⏸️ HELD - Need more evidence\n');
  }

  // Test proposal 2: Should be held (low confidence)
  const debate2 = await engine.debate(
    'skill',
    'x',
    'Do something',
    null
  );

  console.log(`Proposal: ${debate2.proposal_name}`);
  console.log(`Confidence: ${(debate2.confidence * 100).toFixed(0)}%`);
  console.log(`Decision: ${debate2.decision}\n`);

  if (debate2.ready_to_propose) {
    console.log('✅ APPROVED for Telegram\n');
  } else {
    console.log('⏸️ HELD - Need more evidence\n');
  }

  // Save debate log
  engine.saveDrama();

  // Show summary
  const summary = engine.summary();
  console.log('\n📊 Summary:');
  console.log(`   Total debates: ${summary.total_debates}`);
  console.log(`   Approved: ${summary.approved_for_proposal}`);
  console.log(`   Held: ${summary.held_for_evidence}`);
  console.log(`   Average confidence: ${summary.average_confidence}`);
}

if (require.main === module) {
  test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { DebateEngine };

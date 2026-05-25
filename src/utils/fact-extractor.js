#!/usr/bin/env node
// Fact Extractor - Analyzes execution traces and generates insights
// Extracts patterns and stores facts with confidence scores in MEMORY.md

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TRACES_FILE = '/opt/claude-agent/.claude/execution-traces.jsonl';
const MEMORY_DIR = '/home/claude/.claude/projects/-opt-claude-agent/memory';
const FACTS_FILE = path.join(MEMORY_DIR, 'FACTS.md');

fs.mkdirSync(MEMORY_DIR, { recursive: true });

class FactExtractor {
  constructor() {
    this.traces = [];
    this.facts = [];
  }

  async loadTraces() {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(TRACES_FILE);
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      rl.on('line', (line) => {
        try {
          const trace = JSON.parse(line);
          this.traces.push(trace);
        } catch (e) {
          // Skip invalid lines
        }
      });

      rl.on('close', () => resolve());
      rl.on('error', reject);
    });
  }

  extractPatterns() {
    if (this.traces.length === 0) {
      console.log('ℹ️ No traces to analyze');
      return [];
    }

    const facts = [];

    // Extract phase distribution
    const phases = {};
    this.traces.forEach(t => {
      phases[t.phase] = (phases[t.phase] || 0) + 1;
    });

    // Find most common phase
    const mostCommonPhase = Object.entries(phases)
      .sort((a, b) => b[1] - a[1])[0];

    if (mostCommonPhase) {
      facts.push({
        fact: `Most common execution phase is "${mostCommonPhase[0]}" (${mostCommonPhase[1]} times)`,
        confidence: 0.95,
        derived_from: `${mostCommonPhase[1]} trace occurrences`,
        category: 'execution-pattern'
      });
    }

    // Extract cycle patterns
    const cycleIds = {};
    this.traces.forEach(t => {
      cycleIds[t.cycle_id] = (cycleIds[t.cycle_id] || 0) + 1;
    });

    const cycleCount = Object.keys(cycleIds).length;
    const avgTracesPerCycle = (this.traces.length / cycleCount).toFixed(1);

    facts.push({
      fact: `Agent has run ${cycleCount} learning cycles with average ${avgTracesPerCycle} traces per cycle`,
      confidence: 1.0,
      derived_from: `${this.traces.length} total traces across ${cycleCount} cycles`,
      category: 'execution-volume'
    });

    // Look for error patterns
    const errors = this.traces.filter(t =>
      t.phase.includes('error') || t.observation.toLowerCase().includes('error')
    );

    if (errors.length > 0) {
      facts.push({
        fact: `Detected ${errors.length} error traces in recent executions`,
        confidence: 0.9,
        derived_from: `${errors.length} error traces found`,
        category: 'error-detection',
        examples: errors.slice(0, 3).map(e => e.observation)
      });
    }

    // Extract decision points
    const decisions = this.traces.filter(t => t.phase.includes('decision') || t.phase.includes('decision'));
    if (decisions.length > 0) {
      facts.push({
        fact: `Agent makes decisions at ${decisions.length} key checkpoints per learning cycle`,
        confidence: 0.85,
        derived_from: `${decisions.length} decision traces found`,
        category: 'decision-making'
      });
    }

    // Timing insights
    const timingTraces = this.traces.filter(t => t.elapsed_ms !== undefined);
    if (timingTraces.length > 0) {
      const maxTime = Math.max(...timingTraces.map(t => t.elapsed_ms));
      const avgTime = (timingTraces.reduce((sum, t) => sum + t.elapsed_ms, 0) / timingTraces.length).toFixed(0);

      facts.push({
        fact: `Learning cycles complete in ~${avgTime}ms average, maximum ${maxTime}ms`,
        confidence: 0.9,
        derived_from: `${timingTraces.length} timed traces`,
        category: 'performance'
      });
    }

    return facts;
  }

  saveFacts(facts) {
    if (facts.length === 0) {
      console.log('No new facts to save');
      return;
    }

    let content = '';

    try {
      content = fs.readFileSync(FACTS_FILE, 'utf8');
    } catch {
      content = '# Agent Learning Facts\n\nDerived insights with confidence scores.\n\n';
    }

    const timestamp = new Date().toISOString();
    content += `\n## ${timestamp}\n\n`;

    facts.forEach(fact => {
      content += `### ${fact.fact}\n`;
      content += `- **Confidence:** ${(fact.confidence * 100).toFixed(0)}%\n`;
      content += `- **Category:** ${fact.category}\n`;
      content += `- **Derived from:** ${fact.derived_from}\n`;

      if (fact.examples && fact.examples.length > 0) {
        content += `- **Examples:**\n`;
        fact.examples.forEach(ex => {
          content += `  - ${ex.substring(0, 80)}...\n`;
        });
      }

      content += '\n';
    });

    fs.writeFileSync(FACTS_FILE, content);
    console.log(`✅ Saved ${facts.length} facts to ${FACTS_FILE}`);
  }

  summary() {
    return {
      traces_analyzed: this.traces.length,
      cycles: [...new Set(this.traces.map(t => t.cycle_id))].length,
      facts_extracted: this.facts.length,
      categories: [...new Set(this.facts.map(f => f.category))]
    };
  }
}

async function main() {
  console.log('📊 Fact Extractor Starting\n');

  const extractor = new FactExtractor();

  console.log('Loading execution traces...');
  await extractor.loadTraces();

  console.log(`Found ${extractor.traces.length} traces\n`);

  if (extractor.traces.length === 0) {
    console.log('ℹ️ No traces to analyze yet. Run agent-manager.js to generate traces.');
    return;
  }

  console.log('Extracting patterns...');
  const facts = extractor.extractPatterns();
  extractor.facts = facts;

  console.log(`\n🧠 Extracted ${facts.length} facts:\n`);

  facts.forEach((fact, i) => {
    console.log(`${i + 1}. ${fact.fact}`);
    console.log(`   Confidence: ${(fact.confidence * 100).toFixed(0)}%`);
    console.log(`   Category: ${fact.category}\n`);
  });

  extractor.saveFacts(facts);

  const summary = extractor.summary();
  console.log('\n📈 Summary:');
  console.log(`   Traces analyzed: ${summary.traces_analyzed}`);
  console.log(`   Learning cycles: ${summary.cycles}`);
  console.log(`   Facts extracted: ${summary.facts_extracted}`);
  console.log(`   Categories: ${summary.categories.join(', ')}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { FactExtractor };

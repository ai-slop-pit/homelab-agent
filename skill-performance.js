#!/usr/bin/env node
// Skill Performance Tracker - Measures effectiveness of created skills
// Tracks success rate, execution time, resource usage, and problem resolution

const fs = require('fs');
const path = require('path');

const PERF_FILE = '/opt/claude-agent/.claude/skills-performance.json';

class SkillPerformanceTracker {
  constructor() {
    this.skills = this._loadPerformanceData();
  }

  _loadPerformanceData() {
    try {
      return JSON.parse(fs.readFileSync(PERF_FILE, 'utf8'));
    } catch {
      return {
        version: '1.0',
        skills: {},
        created_at: new Date().toISOString()
      };
    }
  }

  _savePerformanceData() {
    fs.writeFileSync(PERF_FILE, JSON.stringify(this.skills, null, 2));
  }

  // Register a new skill when it's created
  registerSkill(skillName, reason, estimatedValue) {
    if (this.skills.skills[skillName]) {
      console.log(`Skill already tracked: ${skillName}`);
      return;
    }

    this.skills.skills[skillName] = {
      name: skillName,
      created_at: new Date().toISOString(),
      created_because: reason,
      estimated_value: estimatedValue,
      runs: [],
      stats: {
        total_runs: 0,
        success_rate: 0,
        avg_duration_ms: 0,
        problem_resolved: null,
        last_run: null
      }
    };

    this._savePerformanceData();
    console.log(`✅ Registered skill: ${skillName}`);
  }

  // Log a skill execution
  logRun(skillName, success, durationMs, result, metadata = {}) {
    if (!this.skills.skills[skillName]) {
      console.log(`⚠️ Skill not registered: ${skillName}`);
      return;
    }

    const skill = this.skills.skills[skillName];

    const run = {
      timestamp: new Date().toISOString(),
      success,
      duration_ms: durationMs,
      result: result.substring(0, 200), // First 200 chars
      metadata
    };

    skill.runs.push(run);

    // Update statistics
    const successfulRuns = skill.runs.filter(r => r.success).length;
    skill.stats.total_runs = skill.runs.length;
    skill.stats.success_rate = (successfulRuns / skill.runs.length * 100).toFixed(1);
    skill.stats.avg_duration_ms = (skill.runs.reduce((sum, r) => sum + r.duration_ms, 0) / skill.runs.length).toFixed(0);
    skill.stats.last_run = run.timestamp;

    this._savePerformanceData();
  }

  // Mark whether the skill actually solved the problem it was created for
  markProblemStatus(skillName, resolved, evidence = '') {
    if (!this.skills.skills[skillName]) {
      console.log(`⚠️ Skill not registered: ${skillName}`);
      return;
    }

    this.skills.skills[skillName].stats.problem_resolved = {
      resolved,
      at: new Date().toISOString(),
      evidence: evidence.substring(0, 200)
    };

    this._savePerformanceData();
    console.log(`✅ Marked problem status for ${skillName}: ${resolved ? 'RESOLVED' : 'NOT_RESOLVED'}`);
  }

  // Evaluate skills: which ones should be retired?
  evaluateSkills() {
    const evaluations = [];

    Object.values(this.skills.skills).forEach(skill => {
      const evalResult = {
        name: skill.name,
        total_runs: skill.stats.total_runs,
        success_rate: parseFloat(skill.stats.success_rate),
        recommendation: null,
        reason: null
      };

      // Never run
      if (skill.stats.total_runs === 0) {
        evalResult.recommendation = 'RETIRE';
        evalResult.reason = 'Never executed since creation';
      }
      // Low success rate
      else if (skill.stats.success_rate < 50) {
        evalResult.recommendation = 'INVESTIGATE';
        evalResult.reason = `Low success rate (${skill.stats.success_rate}%)`;
      }
      // Problem was marked unresolved
      else if (skill.stats.problem_resolved && !skill.stats.problem_resolved.resolved) {
        evalResult.recommendation = 'RETIRE';
        evalResult.reason = 'Problem not resolved despite executions';
      }
      // High success rate and problem resolved
      else if (skill.stats.success_rate >= 60 && skill.stats.problem_resolved && skill.stats.problem_resolved.resolved) {
        evalResult.recommendation = 'KEEP';
        evalResult.reason = 'Adequate success rate and problem resolved';
      }
      // Success but problem not yet evaluated
      else if (skill.stats.success_rate >= 60) {
        evalResult.recommendation = 'EVALUATE';
        evalResult.reason = 'Adequate success rate, awaiting problem resolution check';
      }

      evaluations.push(evalResult);
    });

    return evaluations;
  }

  saveEvaluation(evaluations) {
    let content = '# Skill Performance Evaluation\n\n';
    content += `Generated: ${new Date().toISOString()}\n\n`;

    evaluations.forEach(item => {
      content += `## ${item.name}\n`;
      content += `- **Total runs:** ${item.total_runs}\n`;
      content += `- **Success rate:** ${item.success_rate.toFixed(1)}%\n`;
      content += `- **Recommendation:** ${item.recommendation}\n`;
      content += `- **Reason:** ${item.reason}\n\n`;
    });

    const evalPath = '/home/claude/.claude/projects/-opt-claude-agent/memory/SKILL_EVALUATION.md';
    fs.mkdirSync(path.dirname(evalPath), { recursive: true });
    fs.writeFileSync(evalPath, content);
    console.log(`✅ Evaluation saved to ${evalPath}`);
  }

  summary() {
    const skills = Object.values(this.skills.skills);
    const active = skills.filter(s => s.stats.total_runs > 0);
    const resolved = skills.filter(s => s.stats.problem_resolved && s.stats.problem_resolved.resolved);

    return {
      total_skills: skills.length,
      active_skills: active.length,
      problems_resolved: resolved.length,
      avg_success_rate: (active.length > 0 ?
        (active.reduce((sum, s) => sum + parseFloat(s.stats.success_rate), 0) / active.length).toFixed(1) :
        0) + '%'
    };
  }
}

// Test the performance tracker
async function test() {
  console.log('📊 Skill Performance Tracker Test\n');

  const tracker = new SkillPerformanceTracker();

  // Register some test skills
  tracker.registerSkill('app-health-monitor', 'Detected 3+ app health issues', 'High');
  tracker.registerSkill('email-reminder', 'User requested daily reminders', 'Medium');

  // Simulate execution logs
  tracker.logRun('app-health-monitor', true, 250, 'Successfully detected process crash', { app: 'torrent' });
  tracker.logRun('app-health-monitor', true, 200, 'Detected memory leak in app', { app: 'media-server' });
  tracker.logRun('app-health-monitor', false, 150, 'Failed to connect to monitoring service', {});

  tracker.logRun('email-reminder', true, 100, 'Sent daily reminder email', {});
  tracker.logRun('email-reminder', true, 120, 'Sent daily reminder email', {});

  // Mark problem status
  tracker.markProblemStatus('app-health-monitor', true, 'Caught 2 app failures before cascading impact');
  tracker.markProblemStatus('email-reminder', false, 'User disabled reminders - not actually needed');

  // Evaluate skills
  console.log('\n🔍 Evaluating skills...\n');
  const evaluations = tracker.evaluateSkills();
  evaluations.forEach(eval => {
    console.log(`${eval.name}`);
    console.log(`  Runs: ${eval.total_runs}, Success: ${eval.success_rate.toFixed(0)}%`);
    console.log(`  → ${eval.recommendation}: ${eval.reason}\n`);
  });

  tracker.saveEvaluation(evaluations);

  const summary = tracker.summary();
  console.log('📈 Summary:');
  console.log(`   Total skills: ${summary.total_skills}`);
  console.log(`   Active skills: ${summary.active_skills}`);
  console.log(`   Problems resolved: ${summary.problems_resolved}`);
  console.log(`   Avg success rate: ${summary.avg_success_rate}`);
}

if (require.main === module) {
  test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { SkillPerformanceTracker };

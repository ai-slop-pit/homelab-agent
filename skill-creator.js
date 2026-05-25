#!/usr/bin/env node
// Skill Creator - Auto-creates skills when proposals are approved
// Watches for approvals and creates skill directories with templates

const fs = require('fs');
const path = require('path');
const { SkillPerformanceTracker } = require('./skill-performance');

const SKILLS_DIR = '/opt/claude-agent/.claude/skills';
const PROPOSALS_FILE = '/opt/claude-agent/.claude/proposals.json';

class SkillCreator {
  constructor() {
    this.tracker = new SkillPerformanceTracker();
    this.created = [];
  }

  getApprovedProposals() {
    try {
      const data = JSON.parse(fs.readFileSync(PROPOSALS_FILE, 'utf8'));
      return data.approved || [];
    } catch {
      return [];
    }
  }

  getCreatedSkills() {
    try {
      const items = fs.readdirSync(SKILLS_DIR);
      return items.filter(item => {
        const stat = fs.statSync(path.join(SKILLS_DIR, item));
        return stat.isDirectory();
      });
    } catch {
      return [];
    }
  }

  createSkillFromProposal(proposal) {
    // Check if already created
    if (this.getCreatedSkills().includes(proposal.name)) {
      console.log(`✅ Skill already exists: ${proposal.name}`);
      return false;
    }

    const skillDir = path.join(SKILLS_DIR, proposal.name);
    fs.mkdirSync(skillDir, { recursive: true });

    // Create SKILL.md
    const skillMd = `# ${proposal.name}

## Purpose
${proposal.description}

## Why Created
${proposal.why}

## Estimated Value
${proposal.estimated_value}

## Status
✅ Auto-created from user approval (${new Date().toISOString()})

## Implementation
[To be implemented based on skill requirements]

## Execution
Run with:
\`\`\`bash
bash run.sh
\`\`\`

## Next Steps
1. Define the skill's inputs and outputs
2. Implement run.sh with the core logic
3. Test with sample data
4. Monitor performance via /skill-performance-tracker
`;

    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillMd);

    // Create README.md
    const readmeMd = `# ${proposal.name}

## Overview
${proposal.description}

## Implementation Details
[To be filled in during development]

### Inputs
- [List inputs]

### Outputs
- [List outputs]

## Testing
[Test plan and results]

## Performance Metrics
- Success rate: pending
- Avg execution time: pending
- Problem resolution: pending

## Known Issues
[Any issues or limitations]
`;

    fs.writeFileSync(path.join(skillDir, 'README.md'), readmeMd);

    // Create run.sh template
    const runSh = `#!/bin/bash
# ${proposal.name} - Auto-generated skill runner
# Purpose: ${proposal.description}

set -euo pipefail

echo "🚀 Running: ${proposal.name}"
echo "Time: $(date)"

# TODO: Implement skill logic here
# 1. Validate inputs
# 2. Execute main logic
# 3. Return results

echo "✅ ${proposal.name} complete"
exit 0
`;

    fs.writeFileSync(path.join(skillDir, 'run.sh'), runSh);
    fs.chmodSync(path.join(skillDir, 'run.sh'), 0o755);

    // Create spec.json
    const spec = {
      name: proposal.name,
      version: '1.0.0',
      created_at: new Date().toISOString(),
      triggers: [proposal.why],
      estimated_value: proposal.estimated_value,
      inputs: [],
      outputs: [],
      dependencies: [],
      status: 'created'
    };

    fs.writeFileSync(path.join(skillDir, 'spec.json'), JSON.stringify(spec, null, 2));

    // Register in performance tracker
    this.tracker.registerSkill(proposal.name, proposal.why, proposal.estimated_value);

    console.log(`✅ Skill created: ${proposal.name}`);
    console.log(`   Directory: ${skillDir}`);
    console.log(`   Files: SKILL.md, README.md, run.sh, spec.json`);

    this.created.push({
      name: proposal.name,
      created_at: new Date().toISOString(),
      from_proposal_id: proposal.id
    });

    return true;
  }

  processApprovedProposals() {
    const approved = this.getApprovedProposals();
    const created = this.getCreatedSkills();

    console.log(`\n📦 Processing ${approved.length} approved proposals`);

    let count = 0;
    approved.forEach(proposal => {
      if (proposal.type === 'skill' && !created.includes(proposal.name)) {
        if (this.createSkillFromProposal(proposal)) {
          count++;
        }
      }
    });

    return count;
  }

  summary() {
    return {
      skills_created: this.created.length,
      total_approved_proposals: this.getApprovedProposals().length,
      total_skills: this.getCreatedSkills().length
    };
  }
}

// Test the skill creator
async function test() {
  console.log('🛠️ Skill Creator Test\n');

  const creator = new SkillCreator();

  // Manually add an approved proposal for testing
  const testProposal = {
    id: 'test-001',
    type: 'skill',
    name: 'test-skill-demo',
    description: 'Demo skill created automatically',
    why: 'Testing auto-skill creation',
    estimated_value: 'Medium',
    approved_by: 'test',
    approved_at: new Date().toISOString(),
    status: 'approved'
  };

  console.log('Creating skill from test proposal...\n');
  creator.createSkillFromProposal(testProposal);

  // Check what was created
  const files = fs.readdirSync(path.join(SKILLS_DIR, 'test-skill-demo'));
  console.log(`\n📁 Created files:`);
  files.forEach(f => {
    const filePath = path.join(SKILLS_DIR, 'test-skill-demo', f);
    const stat = fs.statSync(filePath);
    console.log(`   ${f} (${stat.size} bytes)`);
  });

  // Show summary
  const summary = creator.summary();
  console.log(`\n📊 Summary:
   Skills created: ${summary.skills_created}
   Total skills: ${summary.total_skills}
   Approved proposals: ${summary.total_approved_proposals}`);
}

if (require.main === module) {
  test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = { SkillCreator };

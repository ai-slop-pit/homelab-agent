---
name: reflector_agent_learning
description: Reflector now analyzes agent's own processes and capabilities, not just code
metadata:
  type: project
  updated: 2026-06-14
---

## Reflector System Evolution: Agent-Centric Learning

**What changed**: Reflector shifted from code-analysis-focused to agent-strategy-focused.

**Old behavior**: Generate improvement ideas about code (refactor X, extract Y module).

**New behavior**: Analyze completed tasks → identify what strategies work → propose improvements to agent's own instructions, workflows, and capabilities.

### Core Analysis Loop

**Agent Learning (every reflection cycle):**
1. Analyze completed tasks from last 14 days
2. Read current CLAUDE.md instructions
3. Identify: what workflows work, what patterns repeat, what gaps exist
4. Log strategic insights (not just code patterns)
5. Propose: skills to extract, capability gaps to fill, procedures to formalize

**Current Learnings (as of 2026-06-13)**:

- **What Works**: Three-tier significance system (low/medium auto-execute, high requires approval)
- **Pattern**: Infrastructure modules grow incrementally in lib/ for shared functionality
- **Gap**: No explicit verification/testing step documented in task workflow
- **Skill Candidate**: "Task Execution Template" — formal 6-step procedure for task handling

### Key Insight

The agent operates on a **'learn-by-doing feedback loop'**:
1. Execute tasks incrementally
2. Reflect on learnings
3. Formalize patterns into procedures/rules
4. Automate improvements

This works because: (1) safe (limited auto-execution), (2) incremental, (3) accumulative (patterns compound).

Three enablers:
- Memory discipline (mandatory load/update)
- Pattern extraction (recognize reusable problems)
- Significance classification (progressive automation)

### Implementation

Function: `updateAgentCapabilities()` in `/opt/claude-agent/reflector/reflector.js`

- Runs before `generateIdeas()` each cycle
- Analyzes 12 most recent completed tasks
- Calls Claude with strategic analysis prompt
- Logs findings with emoji indicators (💡 insight, ✅ effective, 🔁 patterns, 📊 gaps, 💾 skill)

### Future Work

- Formalize extracted skills as CLAUDE.md procedures
- Create skill templates based on identified patterns
- Update CLAUDE.md with discovered best practices
- Build explicit verification step into task workflow

# Proposing New Skills (Schema-First)

**When to use this: Problem analyzed. Draft SKILL.md and propose to user.**

## Procedure: Design & Propose

**When**: Generic problem characterized; ready to draft skill.

**Schema-First Design**:
1. **Skill identity** (one sentence)
   - "Diagnose app failures by analyzing logs and metrics"
   
2. **Use cases** (2-3 essentials from SKILL.md)
   - When user reports an app issue
   - When monitoring detects an anomaly
   - When troubleshooting a failure
   
3. **Procedure map** (routing table)
   - Link tasks to reference files
   - "When you need to diagnose X, read procedures/DIAGNOSE.md"
   - "When you need to set up monitoring, read procedures/MONITOR.md"
   
4. **Key principle** (one sentence, non-obvious)
   - "Diagnose before fixing. Root cause wins."

5. **Reference procedures** (planned, not yet written)
   - DIAGNOSE.md: How to analyze logs and metrics
   - SETUP.md: How to enable continuous monitoring
   - INTEGRATE.md: How to trigger on crashes

## Example: App-Health-Monitor Skill

**Pattern**: Diagnosed 3 app failures (same approach each time)
**Generic problem**: Systematically identify app failure root causes
**Skill name**: `app-health-monitor`

**Proposed SKILL.md** (sketch):
- Identity: "Diagnose app failures by analyzing logs and metrics"
- Essentials: 1) Diagnose issue, 2) Set up monitoring
- Routing: DIAGNOSE.md, SETUP.md, INTEGRATE.md
- Principle: "Diagnose before fixing"

## Proposal Presentation

Present to user:
- Problem detected (3+ occurrences)
- Skill name and description
- Value proposition
- Ask: "Shall I implement?"

## After Proposal

If approved, hand off to **[IMPLEMENT](IMPLEMENT.md)** to create the skill directory and files.

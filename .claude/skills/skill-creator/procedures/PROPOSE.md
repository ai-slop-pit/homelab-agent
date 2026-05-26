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

## Example: Proposed App-Health-Monitor Skill

```markdown
---
name: app-health-monitor
description: Diagnose app failures by analyzing logs and metrics.
disable-model-invocation: false
---

# App Health Monitor

**Systematically identify root causes of app failures.**

## The Essentials

### 1. Diagnose an App Issue
[Quick steps: which app? what symptoms? analyze logs]

### 2. Set Up Continuous Monitoring
[Enable health checks, set alert thresholds]

## For Specific Tasks

| Task | Read This |
|------|-----------|
| App is down, find root cause | [DIAGNOSE](procedures/DIAGNOSE.md) |
| Set up monitoring for an app | [SETUP](procedures/SETUP.md) |
| Integrate with crash alerts | [INTEGRATE](procedures/INTEGRATE.md) |

## Key Principle

**Diagnose before fixing. Root cause identification prevents recurrence.**
```

## Proposal Presentation

Present to user with:
- **Problem**: "Detected app health diagnostics pattern (3+ occurrences)"
- **Skill name**: `app-health-monitor`
- **Expected value**: "Saves troubleshooting time, enables proactive monitoring"
- **Ready to implement**: Show the draft SKILL.md
- **Ask**: "Shall I implement this?"

## After Proposal

If approved, hand off to **[IMPLEMENT](IMPLEMENT.md)** to create the skill directory and files.

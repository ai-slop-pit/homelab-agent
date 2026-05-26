# Example: app-health-monitor Skill

**This is a concrete example of a skill created using skill-creator.**

---

## Pattern Detection

**Scenario**: Agent solved app failure diagnostics three times in April 2026:
1. qBittorrent crashed → investigated logs → found memory leak
2. Jellyfin slow → analyzed metrics → found disk I/O bottleneck
3. n8n hung → checked processes → found stale connection pool

**Pattern detected**: Same generic problem (diagnose app health via logs + metrics)

---

## Skill Proposal

**Name**: `app-health-monitor`
**Generic problem**: Systematically identify app failure root causes from logs and metrics
**Expected value**: Saves troubleshooting time; enables proactive monitoring

**SKILL.md** (what user sees):
```markdown
---
name: app-health-monitor
description: Diagnose app failures by analyzing logs and metrics. See procedures/.
disable-model-invocation: false
---

# App Health Monitor

**Systematically identify root causes of app failures.**

## The Essentials

### 1. Diagnose a Failing App
- What app? What symptoms?
- Check: logs, metrics, system resources
- Identify: root cause

### 2. Set Up Continuous Monitoring
- Enable health checks for critical apps
- Set alert thresholds
- Integrate with crash detection

## For Specific Tasks

| Task | Read This |
|------|-----------|
| App is down, find root cause | [DIAGNOSE](procedures/DIAGNOSE.md) |
| Set up monitoring for an app | [SETUP](procedures/SETUP.md) |
| Integrate with alerts | [INTEGRATE](procedures/INTEGRATE.md) |

## Key Principle

**Diagnose before fixing. Root cause identification prevents recurrence.**
```

---

## Procedure Example: DIAGNOSE.md

```markdown
# Diagnosing Application Failures

**When to use this: An app has crashed or is behaving unexpectedly.**

## Procedure: Root Cause Analysis

**When**: User reports app issue OR system detects anomaly

**Analysis steps**:
1. Identify the app and symptoms
2. Check logs (last 100 lines for errors, warnings)
3. Check metrics (CPU, memory, disk I/O, network)
4. Cross-reference: which metric spike preceded the failure?
5. Identify likely root cause
6. Verify: can you reproduce or confirm?

## Example: Jellyfin Performance Degradation

**Symptoms**: Jellyfin streaming is slow, 1000ms latency

**Log check**:
```
[ERROR] Disk read timeout at 14:32
[WARN] Cache eviction triggered
```

**Metrics check**:
- CPU: 45% (normal)
- Memory: 6.2GB / 8GB (high)
- Disk I/O: 500MB/s sustained (bottleneck!)
- Network: 50Mbps (normal)

**Diagnosis**: Disk I/O saturation (likely video file access bottleneck)

**Confirmation**: Cleared temp cache → Jellyfin latency dropped to 200ms

**Next**: Could implement SSD cache or adjust read buffer
```

---

## Implementation Checklist

✅ SKILL.md (manifest): 22 lines
✅ procedures/DIAGNOSE.md: 48 lines
✅ procedures/SETUP.md: 46 lines
✅ procedures/INTEGRATE.md: 44 lines
✅ Total: ~160 lines (lean, focused)

---

## Usage: First Month

**Week 1**: App crashes → user calls agent → DIAGNOSE.md resolves in 5 min (manual)

**Week 2**: Three apps fail → agent proactively suggests SETUP.md → sets up monitoring

**Week 3**: Crash detected → agent auto-triggers DIAGNOSE → provides root cause

**Week 4**: Fifth app issue → monitoring prevented 2 outages

**Effectiveness**: 5 uses in 4 weeks → strong signal → keep and refine

---

## Evolution: Month 2

**User request**: "Can the skill fix issues, not just diagnose?"
**Decision**: Out of scope for app-health-monitor. Propose separate app-health-fixer skill.

**Feedback**: "Why doesn't it check disk space first?"
**Action**: Refine DIAGNOSE.md → add disk space check as priority 1

**Metric**: 12 uses this month, 92% success rate
**Result**: Skill is working; monitor next month


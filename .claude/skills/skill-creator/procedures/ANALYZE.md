# Analyzing Generic Problems

**When to use this: Pattern detected. What is the core problem being solved?**

## Procedure: Characterize the Problem

**When**: Pattern has been detected; now extract the generic problem class.

**Analysis Steps**:
1. **Identify the core operation**: What action repeats?
   - Example: "Diagnose app failures" (not "fix qBittorrent")
   
2. **Isolate inputs & outputs**: What does the skill consume/produce?
   - Inputs: app name, symptoms, logs access
   - Outputs: root cause, suggested fix, log references
   
3. **Define triggers**: When should this skill activate?
   - On user request: "check qBittorrent"
   - Automatically: Detect app crash, then diagnose
   - Scheduled: Periodic health scans
   
4. **Scope boundaries**: What is IN scope, what is OUT?
   - IN: Diagnostics, log analysis, pattern matching
   - OUT: Actually fixing the app (that's separate)
   
5. **Generic problem statement** (one sentence):
   - "Diagnose application failures by analyzing logs and metrics"
   - NOT: "Fix qBittorrent crashes"

## Example: App Health Monitoring

**Detected pattern**: Troubleshot qBittorrent (3x), Jellyfin (2x), n8n (1x)

**Core operation**: Diagnose app health issues

**Generic problem**: *"Systematically identify app failure root causes from logs and metrics"*

**Inputs**: App name, symptom description
**Outputs**: Root cause analysis, fix suggestion
**Triggers**: User request OR automatic crash detection
**Scope**: 
- IN: Log analysis, metric inspection, pattern recognition
- OUT: Implementation of fixes (separate workflow)

## After Analysis

Hand off to **[PROPOSE](PROPOSE.md)** to design the skill schema and draft SKILL.md.

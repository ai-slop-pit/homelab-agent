# Detecting Reusable Patterns

**When to use this: You've just solved a problem that feels familiar. Is this a pattern?**

## Procedure: Detect Pattern

**When**: During work, after solving a problem, ask: "Have I solved this before?"

**Detection Heuristics**:
1. **Repetition**: Same problem 3+ times in recent work
2. **Generalization**: "This isn't specific to X; it applies to any Y"
3. **Friction**: Manual steps that could be automated
4. **Blindness**: "I've seen this error pattern 4 times but never systematized it"
5. **Opportunity**: "If I had a skill for this, I could save time"

**Decision Tree**:
- Is this a one-off problem? → No skill needed
- Could I use this 3+ more times this year? → Likely pattern
- Is there a generic problem class? → Yes, design skill
- Would it help other agents/users? → Higher priority

## Example: Pattern Detection in Action

**Scenario**: You ask Claude to troubleshoot three app failures this month.
```
Task 1: "Check qBittorrent"
→ Investigate logs, identify issue, fix

Task 2: "Why is Jellyfin slow?"
→ Same approach: logs → metrics → root cause

Task 3: "n8n is hanging"
→ Same pattern again
```

**Detection**: "I've done this three times. Generic problem: app-health diagnosis"
- Inputs: app name, symptoms
- Outputs: root cause, suggested fix
- Procedure: logs → metrics → pattern match
- **Conclusion**: Propose `app-health-monitor` skill

## After Detection

Once pattern is detected, hand off to **[ANALYZE](ANALYZE.md)** to characterize the generic problem.

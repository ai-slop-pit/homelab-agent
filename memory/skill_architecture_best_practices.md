---
name: skill-architecture-best-practices
description: How to build agent-native skills (no executables; pure reasoning + guidelines)
metadata: 
  node_type: memory
  type: feedback
  lastUpdated: 2026-05-26
  lesson_from: memory-manager skill rebuild
  originSessionId: ba698004-e1e7-4332-8d6b-f69c656edc9f
---

# Skill Architecture Best Practices

**Critical insight**: Skills are NOT CLI tools you build for agents to invoke. Skills are **behavioral capabilities** that agents embody through reasoning.

## The Wrong Way (Anti-Pattern)

❌ **Build a skill as an executable script**:
```bash
memory-manager.sh audit      # Running as a tool
memory-manager.sh log-usage  # Agent invokes like CLI
```

**Problems**:
- Treats agent as user calling CLI tool
- Agent doesn't reason; just invokes commands
- No learning or adaptation (script is static)
- Maintenance burden (update bash, fix bugs)
- Poor error handling in shell
- Scripts don't improve over time

## The Right Way (Agent-Native)

✅ **Build a skill as reasoning guidelines + heuristics**:

```
skill-name/
├── SKILL.md           # Procedures agent should follow
├── heuristics.json    # Decision rules (thresholds, TTLs, conditions)
└── README.md          # How agent should approach the work
```

**Agent executes the skill by**:
1. Reading SKILL.md (understand procedures)
2. Reading heuristics.json (consult decision rules)
3. Using native tools (Read, Edit, Write, reasoning)
4. Reasoning through the problem

**No scripts. No executables. No generated files. Pure reasoning.**

## Architecture Pattern

### SKILL.md Structure

Define **procedures** (what agent does), not commands:

```markdown
# [Skill Name]

## When Agent Uses This Skill
[Triggers: on user request, periodic, implicit]

## Agent Procedures

### Procedure 1: [Name]
1. [Action using Read tool]
2. [Reasoning step]
3. [Action using Edit/Write tools]

### Procedure 2: [Name]
...
```

**Don't write**:
```bash
memory-manager audit     # ← CLI command
memory-manager.sh log    # ← Bash invocation
```

**Write**:
```
When user says "audit memory":

Agent:
1. Read all memory files using Read tool
2. Analyze using heuristics.json rules
3. Report findings
4. Propose improvements
5. Wait for user approval
6. Update using Edit/Write tools
7. Log to performance.json
```

### heuristics.json Structure

Define **decision rules** agent should apply:

```json
{
  "duplicate_threshold": 0.60,
  "freshness_ttl": {
    "critical": 7,
    "normal": 30,
    "historical": 60
  },
  "consolidation_rule": "Only if superset",
  "confidence": {
    "high": "Threshold > 70%",
    "low": "Threshold < 60%"
  }
}
```

Agent reads this when analyzing: "Is this above 60% similarity? Propose consolidation."


## Why This Works Better

| Aspect | Script-Based (❌) | Agent-Native (✅) |
|--------|-----------------|-----------------|
| **Who reasons?** | Script heuristics (dumb) | Claude (intelligent) |
| **Flexibility** | Hard-coded; must edit code | Agent adjusts based on context |
| **Learning** | No learning; script is static | Agent learns from each execution |
| **Maintenance** | Script rot, bugs, compatibility | Guidelines + heuristics only |
| **Error handling** | Bash error handling (awkward) | Claude reasoning (natural) |
| **Dependencies** | Bash, jq, python, etc. | Only: Read, Edit, Write tools |
| **Future evolution** | Rewrite skill code | Refine heuristics + procedures |
| **Scale** | Degrades with complexity | Scales naturally with agent capability |

## Real Example: memory-manager Evolution

### Version 1.0 (Wrong)
```
Created 11KB bash script (memory-manager.sh)
- Tries to detect duplicates with line-counting
- Hardcoded task mappings
- JSON handling via jq workarounds
- Fragile YAML parsing with grep
- Silent failures via || true

Problem: "Why build a tool when the agent IS the tool?"
```

### Version 2.0 (Right)
```
Skill structure:
- SKILL.md (5 procedures: audit, freshness, log, update, archive)
- heuristics.json (decision rules: thresholds, TTLs, conditions)
- README.md (how agent approaches memory management)

Agent executes by:
1. Reading procedures from SKILL.md
2. Using Read tool to load memory files
3. Applying heuristics.json rules via reasoning
4. Using Edit/Write tools for updates

Result: No bash script, no config files, no maintenance burden, agent learns over time.
```

## Pattern: How to Recognize a Good Skill

**Good skill**:
- ✅ Is pure reasoning + guidelines (no executables)
- ✅ Exposes decision rules in JSON (heuristics.json)
- ✅ Has procedures agent can follow (SKILL.md)
- ✅ Tracks metrics (performance.json)
- ✅ Improves over time through agent feedback
- ✅ Scales with agent capability
- ✅ Can be understood by reading docs

**Bad skill**:
- ❌ Is a bash/python/node script you invoke
- ❌ Has hard-coded decision logic in code
- ❌ Requires maintaining executable
- ❌ Doesn't expose heuristics (they're buried in code)
- ❌ No feedback mechanism
- ❌ Dies when code needs refactoring
- ❌ Requires external dependencies

## When to Use This Pattern

**Use agent-native skills for:**
- Long-running operations (monitoring, auditing, maintenance)
- Learnable tasks (improve through feedback)
- Tasks requiring reasoning (not just data processing)
- Skills that should evolve (agent improves its own heuristics)

**OK to use executables for:**
- One-off data transformations
- External API calls (need specific libraries)
- Heavy computation (not core to agent reasoning)
- System administration (interacting with OS)

## How Agent Improves Its Skill Over Time

### Initial state
- Heuristics have default values (duplicate_threshold = 0.60)
- Procedures are basic
- No performance history

### After 10 audits
- Agent tracks: "threshold 0.60 causes false positives"
- Proposes: "Raise threshold to 0.70?"
- User approves, updates heuristics.json
- Agent now better at consolidation

### After 100 tasks
- Agent notices: "Files about disk issues aren't loaded for storage problems"
- Semantic map is incomplete
- Proposes: "Add disk-storage → incident_boot_failure_sda_removal mapping?"
- User approves, memory improves

### After 6 months
- Agent has autonomously evolved heuristics
- Memory is perfectly organized for actual work patterns
- No manual refactoring needed
- Skill gets better every day

## Summary for Future Skill Creation

When you build the next skill (app-monitor, setup-artifact-manager, predictor, etc.):

1. **Don't write a script** — Write procedures
2. **Expose decision rules** — Use heuristics.json
3. **Agent reasons, not invokes** — Pure reasoning + tools
4. **Track metrics** — Let agent log what works/doesn't
5. **Embrace evolution** — Heuristics improve over time
6. **Document expectations** — README explains agent's role

**Template structure**:
```
skill-name/
├── SKILL.md           ← Agent procedures (how to approach the work)
├── heuristics.json    ← Decision rules (thresholds, conditions, weights)
├── README.md          ← Implementation guide for agent thinking
├── SPEC.json          ← Metadata + configuration
├── performance.json   ← Metrics structure (agent populates this)
└── INTEGRATION.md     ← How user interacts with skill
```

That's it. No code. Pure reasoning.

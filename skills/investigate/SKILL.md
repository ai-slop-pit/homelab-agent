# Investigate Skill

**Autonomous web research and context offloading to Gemini CLI.**

Agent automatically delegates research, web lookups, and knowledge gaps to Gemini when:
- Topic is outside training data or knowledge cutoff
- Need to verify claims or gather current information
- Links need to be followed and summarized
- Broader context required beyond agent's immediate reasoning

## Identity

`investigate` is a **agent-native behavioral skill**: reasoning guidelines for autonomous research delegation. When the agent detects it needs research, it automatically:
1. Formulates a research prompt (including "what should you return?")
2. Calls `gemini` CLI directly via Bash with model selected based on problem complexity
3. Receives structured findings
4. Integrates results back into reasoning
5. Logs delegation to `logs/investigate/`
6. If findings are important → memory-skill auto-captures

## What Agent Does (Scope)

✅ **Detect** when research is needed (knowledge gap, claim verification, URL context, current info)
✅ **Delegate** automatically to `gemini` CLI without hesitation
✅ **Select model** based on problem: simple (Flash), complex (Pro), synthesis (Extended)
✅ **Structure prompt** with clear output format request
✅ **Log delegations** to `logs/investigate/` with timestamp, query, model, findings
✅ **Integrate** findings back into main reasoning
✅ **Trigger memory-skill** if findings should be remembered

❌ **Wait for approval** to research
❌ **Hesitate** when uncertain — delegate instead
❌ **Cache results** — fresh research each time
❌ **Hide delegations** — log transparently

## Agent Procedures

### Procedure 1: Detect Research Need

**When**: Agent encounters:
- "I need to check this URL" 
- "This is outside my knowledge cutoff"
- "I should verify this claim"
- "I need current information about X"
- "I need broader context than my training covers"

**Decision**:
- Is this a knowledge gap? → Investigate
- Do I need to verify something? → Investigate
- Is this outside my cutoff (Feb 2025)? → Investigate
- Do I need context from a URL? → Investigate

### Procedure 2: Formulate Research Request

**Steps**:
1. Define the topic/query precisely
2. Add context: "What problem am I solving?"
3. Choose model hint:
   - `simple`: Fact lookup, quick summary, basic verification (use gemini-2.0-flash)
   - `complex`: Deep analysis, synthesis, nuanced understanding (use gemini-2.0-pro)
   - `synthesis`: Multi-source synthesis, opinion synthesis (use gemini-2.0-flash extended)
4. Specify output format in the prompt itself: "Return as: [format]"
   - Examples: "structured outline", "key facts + sources", "summary + evidence", "comparison table"
5. Call gemini CLI via Bash:
   ```bash
   gemini --model gemini-2.0-flash "Topic: X. Context: Y. Return format: Z. Findings:"
   ```

### Procedure 3: Log and Integrate

**Steps**:
1. Agent logs delegation to `logs/investigate/[YYYY-MM-DD].log` via Bash:
   ```
   [HH:MM:SS] QUERY: <topic>
   CONTEXT: <problem being solved>
   MODEL: <selected model>
   OUTPUT_REQUEST: <format requested>
   ---
   FINDINGS:
   <gemini output>
   ---
   ```
2. Agent integrates findings into reasoning
3. If important: agent calls memory-skill to capture learning

### Procedure 4: Trigger Memory Capture

**When**: Research findings contain important information

**Agent decision**:
- Is this a pattern/lesson I should remember? → Memory-skill
- Is this configuration/setup info? → Setup artifacts
- Is this a preference or discovered pattern? → User memory
- Is this feedback on something I got wrong? → Feedback memory

Example:
```
# Research found: Proxmox 9.2 has breaking change in container snapshots
Agent: "This is important infrastructure knowledge. Saving to memory."
Memory-skill: Creates new memory file with the finding
```

## Model Selection Guide

| Problem Type | Model | Cost | Use Case |
|------|-------|------|----------|
| `simple` | `gemini-2.0-flash` | Low | Quick facts, basic lookup, simple summary |
| `complex` | `gemini-2.0-pro` | Medium | Analysis, verification, synthesis |
| `synthesis` | `gemini-2.0-flash` | Low | Multi-source synthesis, opinions, comparisons |

**Decision rule**: Start with Flash; upgrade to Pro if reasoning depth needed.

## Constraints

1. **Automatic**: No approval gate. If agent detects research need, delegate immediately.
2. **Transparent**: Log all delegations. Show user when delegating.
3. **No caching**: Fresh research each time (memcpy to memory only if important).
4. **Fresh context**: Agent uses current findings, not stale cached data.
5. **Model based on problem**: Don't default to most expensive; choose wisely.
6. **Output format in prompt**: Make Gemini aware of desired format.

## Related Concepts

- **Memory-skill integration**: Important findings trigger memory capture
- **Automatic triggers**: No manual invocation needed; agent detects and delegates
- **Context offloading**: Keeps main agent context smaller by outsourcing heavy reading
- **Cost optimization**: Use cheaper models (Flash) for simple lookups, expensive (Pro/Ultra) for synthesis

## Evolution Notes

- As agent uses this skill, watch for patterns in what gets researched
- Might evolve into specialty research: "fact-checker", "trend-analyzer", "code-analyzer"
- Opportunity: Build cached research archive for repeated questions (user decides if worth it)
- Feedback loop: Track which research findings turn into memory; improve research heuristics

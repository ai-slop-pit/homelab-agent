# Investigate Skill

**Autonomous web research and context offloading to Gemini CLI.**

Agent automatically delegates research, web lookups, and knowledge gaps to Gemini when:
- Topic is outside training data or knowledge cutoff
- Need to verify claims or gather current information
- Links need to be followed and summarized
- Broader context required beyond agent's immediate reasoning

## Identity

`investigate` is a **agent-native behavioral skill**: reasoning guidelines for autonomous research delegation. When the agent detects it needs research, it automatically:
1. Assesses complexity: simple lookup vs. web-based research vs. comprehensive analysis
2. Selects appropriate tool: standard model (Flash/Pro), Deep Research API, or Deep Research Max
3. Formulates structured prompt with desired output format
4. Calls `gemini` CLI directly via Bash
5. Receives structured findings (with sources for Deep Research)
6. Integrates results back into reasoning
7. Logs delegation to `logs/investigate/[date].log`
8. If findings are important → memory-skill auto-captures

## What Agent Does (Scope)

✅ **Detect** when research is needed (knowledge gap, claim verification, current info, web-based synthesis)
✅ **Assess complexity**: Simple lookup vs. iterative web research vs. comprehensive analysis
✅ **Delegate** automatically to appropriate Gemini tool without hesitation
✅ **Select model**: Standard models for facts, Deep Research API for web verification, Deep Research Max for analysis
✅ **Structure prompt** with clear output format request
✅ **Log delegations** to `logs/investigate/` with timestamp, query, model, findings, sources
✅ **Integrate** findings back into main reasoning
✅ **Trigger memory-skill** if findings should be remembered

❌ **Wait for approval** to research
❌ **Hesitate** when uncertain — delegate instead
❌ **Cache results** — fresh research each time
❌ **Hide delegations** — log transparently
❌ **Assume knowledge** when Deep Research API exists for exactly this purpose

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
2. Assess complexity:
   - Is this **simple fact lookup** (knowledge in training data)? → Use standard model (Flash/Pro)
   - Is this **web-based research** (needs current info, verification, synthesis)? → Use Deep Research API
   - Is this **comprehensive analysis** (background task, high quality needed)? → Use Deep Research Max
3. Choose appropriate approach:
   - **Standard model** (simple): `gemini-3-5-flash` or `gemini-3-1-pro`
   - **Deep Research** (complex web): `google-deepresearch-1.0`
   - **Deep Research Max** (comprehensive): `google-deepresearch-max-1.0`
4. Specify output format in the prompt: "Return as: [format]"
   - Examples: "structured outline", "key facts + sources", "summary + evidence", "comparison table"
5. Call via Bash:
   ```bash
   # Simple lookup
   gemini --model gemini-3-5-flash "Topic: X. Context: Y. Return: Z"
   
   # Web research with iteration
   gemini --model google-deepresearch-1.0 "Research: X. Find: Y. Return: Z"
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

## Model Selection Guide (Updated May 2026)

### Standard Models for Simple Research
| Problem Type | Model | Cost | Use Case |
|------|-------|------|----------|
| `simple` | `gemini-3-5-flash` | Low | Quick facts, basic lookup, simple summary |
| `complex` | `gemini-3-1-pro` | Medium | Analysis, verification, synthesis |
| `speed` | `gemini-3-1-flash-lite` | Very Low | Speed-critical lookups, cost-optimized |

**Decision rule**: Start with Flash; upgrade to Pro if reasoning depth needed.

### Deep Research API (Recommended for Investigation)
For complex multi-step research, use **Deep Research API**:
- **`google-deepresearch-1.0` (Deep Research)**: Iterative web search + synthesis, optimized for speed
  - Recommended for: Verification, current info, multi-source synthesis, complex topics
  - How it works: Plans investigation → formulates sub-questions → searches iteratively → synthesizes findings
  
- **`google-deepresearch-max-1.0` (Deep Research Max)**: Maximum comprehensiveness with extended reasoning
  - Recommended for: Comprehensive analysis, background workflows, highest quality needed
  - Use when: Speed isn't critical, need deep understanding

**When to use Deep Research**: Topic requires web search, verification, or multi-step reasoning
**When to use standard models**: Simple factual lookup, verification against knowledge cutoff

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

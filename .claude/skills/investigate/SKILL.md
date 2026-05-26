---
name: investigate
description: Research current topics, verify facts, gather info outside knowledge cutoff (Feb 2025). Auto-delegate web lookups and real-time data via Gemini CLI.
disable-model-invocation: false
---

# Investigate Skill

**Research, verification, and current information lookup via Gemini CLI.**

**Use this skill when you need to:**
- Research current topics (stock prices, news, trends, events)
- Verify claims or facts with web sources
- Gather information outside your knowledge cutoff (Feb 2025)
- Synthesize information across multiple sources
- Get current data or real-time information

**Invoke directly:** `Skill investigate: <research query>` for any research task.

**Agent also auto-delegates** research, web lookups, and knowledge gaps to Gemini when:
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
✅ **Plan strategically** using Structured Analytic Techniques (SAT): competing hypotheses, assumptions check, evidence matrix
✅ **Assess complexity**: Simple lookup vs. iterative web research vs. comprehensive analysis with SAT
✅ **Delegate** automatically to appropriate Gemini tool without hesitation
✅ **Select model**: Standard models for facts, Deep Research API for web verification, Deep Research Max for SAT analysis
✅ **Structure prompt** with SAT framework, MECE decomposition, Two-Source Rule requirements, triangulation tiers
✅ **Verify findings** using Two-Source Rule (≥2 independent sources for critical claims) and Evidence Triangulation (Primary/Expert/Behavioral tiers)
✅ **Generate empirical reproduction artifacts** to prove critical findings independently verifiable
✅ **Log delegations** to `logs/investigate/` with evidence matrix, hypothesis testing results, verification status, reproduction artifacts
✅ **Integrate** findings back into main reasoning with confidence levels based on evidence strength
✅ **Trigger memory-skill** if findings should be remembered
✅ **Identify contradictions** between sources and flag for follow-up investigation

❌ **Wait for approval** to research
❌ **Hesitate** when uncertain — delegate instead
❌ **Cache results** — fresh research each time
❌ **Hide delegations** — log transparently
❌ **Assume knowledge** when Deep Research API exists for exactly this purpose
❌ **Accept claims without verification** — apply Two-Source Rule rigorously
❌ **Report findings without showing work** — always trace evidence-to-conclusion mappings
❌ **Make unsubstantiated conclusions** — all high-stakes claims require empirical reproduction artifacts

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

### Procedure 2: Formulate Research Strategy (Structured Analytic Techniques)

**Before researching, establish:**

1. **Competing Hypotheses (ACH)**: Identify ALL plausible explanations
   - Example: "Why is WIX stock low?" → (a) Market conditions, (b) Company fundamentals, (c) Industry disruption, (d) Management decisions, (e) Valuation reset
   
2. **Key Assumptions Check (KAC)**: List every assumption your research relies on
   - Example: "Assuming public sources are accurate", "Assuming historical patterns hold"
   
3. **Evidence Matrix Template**: Plan what evidence would support/refute each hypothesis
   - Will collect evidence in three tiers: Primary (filings, logs), Expert (analyst reports), Behavioral (market reactions)

4. **Decompose into MECE Sub-Questions**: Break into Mutually Exclusive & Collectively Exhaustive branches
   - Don't ask "why is this low?" — ask: "What market factors apply?", "What company fundamentals changed?", "What competitive threats emerged?"

### Procedure 3: Execute Research Request

**Steps**:
1. Define the topic/query precisely
2. Assess complexity:
   - Is this **simple fact lookup** (knowledge in training data)? → Use standard model (Flash/Pro)
   - Is this **web-based research** (needs current info, verification, synthesis)? → Use top-notch model with web access
   - Is this **comprehensive analysis** (background task, high quality needed)? → Use best available model
3. Choose Gemini model in priority order (try top first, fallback if not available):
   - **Top-notch for research**: `gemini-2.0-pro` (best reasoning)
   - **Fallback high-quality**: `gemini-2.0-flash` (excellent synthesis, faster)
   - **Web research specialist**: Try Deep Research models if available
   - **Fallback**: Use whatever Gemini is available via CLI
4. **Specify output format in prompt to include evidence tracing**:
   - "Return as: Evidence matrix mapping findings to sources (Primary/Expert/Behavioral tier)"
   - "For each key claim: include 2+ independent sources (Two-Source Rule)"
   - "Highlight any contradictions between sources"
5. Call via Bash with enhanced prompt structure:
   ```bash
   # Include SAT structure in query
   gemini -p "Research: X
   
   Hypotheses to test: [list competing hypotheses]
   Key assumptions: [list assumptions to validate]
   
   Find evidence across three tiers:
   - Primary: Official documents, filings, raw data
   - Expert: Analyst reports, technical docs, established sources
   - Behavioral: Market reactions, reproducible observations
   
   For critical claims: Apply Two-Source Rule (2+ independent sources required)
   Return as: Evidence matrix with hypothesis-to-evidence mappings"
   ```

### Procedure 4: Verify Findings (Two-Source Rule & Triangulation)

**Critical claims require verification across sources:**

1. **Two-Source Rule**: No critical claim is accepted without corroboration from ≥2 independent sources
   - Different news outlets ≠ independent (both cite same original source)
   - Primary source (filing) + Expert analysis (analyst) = valid pair
   
2. **Evidence Triangulation**: Verify from three perspectives
   - **Tier 1 - Primary Evidence**: Official documents, financial filings, raw logs, code, source data
   - **Tier 2 - Expert Analysis**: Analyst reports, technical documentation, established research
   - **Tier 3 - Behavioral Observation**: Market reactions, reproducible test cases, pattern evidence
   
3. **Contradiction Detection**: Flag any conflicts between sources
   - Document which sources agree/disagree on each key claim
   - Identify why sources differ (timing, methodology, bias)

4. **Evidence Chain of Custody**: Maintain audit trail
   - Source → Interpretation → Conclusion (make each step traceable)

### Procedure 5: Generate Empirical Reproduction Artifact

**Critical findings must have a "proof artifact":**
- Stock research → Price charts + earnings dates + market context
- System outage → Reproducible log sequence + timestamps + event markers
- Code bug → Minimal failing test case that demonstrates the issue

**Artifact purpose**: Allow anyone (or another agent) to independently verify the conclusion

### Procedure 6: Log, Integrate, and Synthesize

**Steps**:
1. Agent logs delegation to `logs/investigate/[YYYY-MM-DD].log` via Bash:
   ```
   [HH:MM:SS] QUERY: <topic>
   HYPOTHESES TESTED: [list]
   CONTEXT: <problem being solved>
   MODEL: <selected model>
   VERIFICATION_STATUS: Two-Source compliant? Triangulation complete?
   ---
   EVIDENCE MATRIX:
   [hypothesis | supporting sources | refuting sources | confidence]
   ---
   KEY FINDINGS:
   <gemini output>
   ---
   REPRODUCTION ARTIFACT: <link or description>
   ```
2. Agent synthesizes findings against original hypotheses
3. Agent identifies which hypotheses were supported/refuted
4. If important: agent calls memory-skill to capture learning
5. If contradictions found: flag for follow-up investigation

### Procedure 7: Trigger Memory Capture

**When**: Research findings contain important information

**Agent decision**:
- Is this a pattern/lesson I should remember? → Memory-skill
- Is this configuration/setup info? → Setup artifacts
- Is this a preference or discovered pattern? → User memory
- Is this feedback on something I got wrong? → Feedback memory
- Did we uncover research methodology improvements? → Skill feedback

Example:
```
# Research found: Proxmox 9.2 has breaking change in container snapshots
Agent: "This is important infrastructure knowledge. Saving to memory."
Memory-skill: Creates new memory file with the finding

# Research methodology note: SAT approach revealed 3 hypotheses, only 1 was correct
Agent: "This method is working. Evidence matrix prevented confirmation bias."
```

## Model Selection Guide (Updated May 2026)

### Standard Models for Simple Research
| Problem Type | Model | Cost | Use Case |
|------|-------|------|----------|
| `simple` | `gemini-3-5-flash` | Low | Quick facts, basic lookup, simple summary |
| `complex` | `gemini-3-1-pro` | Medium | Analysis, verification, synthesis with SAT |
| `speed` | `gemini-3-1-flash-lite` | Very Low | Speed-critical lookups, cost-optimized |

**Decision rule**: Start with Flash; upgrade to Pro if SAT analysis or deep reasoning needed.

### Deep Research API (Recommended for Investigation)
For complex multi-step research, use **Deep Research API**:
- **`google-deepresearch-1.0` (Deep Research)**: Iterative web search + synthesis, optimized for speed
  - Recommended for: Verification with Two-Source Rule, current info, multi-source synthesis, complex topics
  - How it works: Plans investigation → formulates sub-questions → searches iteratively → synthesizes findings with evidence tracing
  
- **`google-deepresearch-max-1.0` (Deep Research Max)**: Maximum comprehensiveness with extended reasoning
  - Recommended for: Comprehensive SAT analysis, background workflows, highest quality needed
  - Use when: Speed isn't critical, need deep understanding, require full evidence triangulation
  - Ideal for: High-stakes conclusions that must withstand scrutiny

**When to use Deep Research**: Topic requires web search, verification, or multi-step reasoning + evidence triangulation
**When to use standard models**: Simple factual lookup, verification against knowledge cutoff, single-source lookups
**When to use Deep Research Max**: Complex SAT required, multiple competing hypotheses, high confidence threshold needed

## Advanced Patterns

### Parallel Investigation (For Complex Topics)
When researching multi-faceted questions (e.g., "Why is stock low?"), investigate branches in parallel:
- Branch 1: Market & macroeconomic factors
- Branch 2: Company fundamentals & earnings
- Branch 3: Competitive landscape & industry trends
- Branch 4: Management & strategic decisions

Bring results together into unified evidence matrix to avoid siloed conclusions.

### Red Team / Devil's Advocate
For high-stakes conclusions, formally challenge your findings:
- "What evidence would prove this conclusion wrong?"
- "Which source might have bias or incomplete data?"
- "What alternative explanation fits the evidence equally well?"

## Constraints & Requirements

1. **Structured Analysis Required**: All non-trivial research must include SAT (competing hypotheses, assumptions check, evidence matrix)
2. **Automatic**: No approval gate. If agent detects research need, delegate immediately.
3. **Transparent**: Log all delegations. Show user when delegating.
4. **Two-Source Rule**: Critical claims require ≥2 independent sources (no exceptions)
5. **Evidence Triangulation**: Findings must be verified across Primary/Expert/Behavioral tiers
6. **No caching**: Fresh research each time (memcpy to memory only if important).
7. **Fresh context**: Agent uses current findings, not stale cached data.
8. **Model based on problem**: Don't default to most expensive; choose wisely.
9. **Empirical Reproduction**: Critical findings must have a reproducible verification artifact
10. **Audit Trail**: Maintain chain of custody for all evidence-to-conclusion mappings

## Related Concepts

- **Memory-skill integration**: Important findings trigger memory capture
- **Automatic triggers**: No manual invocation needed; agent detects and delegates
- **Context offloading**: Keeps main agent context smaller by outsourcing heavy reading
- **Cost optimization**: Use cheaper models (Flash) for simple lookups, expensive (Pro/Ultra) for synthesis

## Implementation Examples

### Example 1: Stock Research (WIX Stock Decline)
**SAT Planning:**
- Hypotheses: (a) Market conditions, (b) Company fundamentals, (c) Competitive threats, (d) Management execution, (e) Valuation reset
- Assumptions: Public sources accurate, analyst consensus reliable, historical patterns hold
- Triangulation plan: Earnings reports (Primary) + Analyst consensus (Expert) + Market reactions (Behavioral)

**Evidence Matrix Output:**
```
| Hypothesis | Primary Evidence | Expert Evidence | Behavioral Evidence | Confidence |
|---|---|---|---|---|
| Company fundamentals | Q1 earnings miss | Analyst downgrades | Stock collapse after earnings | High |
| Competitive threats | New AI competitors | Industry analysis | Market share loss indicators | Medium |
| Management execution | AI investment overrun | Strategic reviews | Delayed product launches | High |
```

**Two-Source Verification**: Every major claim backed by 2+ independent sources (e.g., earnings + analyst report, not just analyst report alone)

**Reproduction Artifact**: Price chart + earnings timeline + analyst rating changes (proves causality)

### Example 2: System Outage Investigation
**SAT Planning:**
- Hypotheses: (a) Code bug, (b) Resource exhaustion, (c) External dependency failure, (d) Configuration drift
- Assumptions: Logs are reliable, monitoring was accurate, no concurrent changes

**Triangulation:**
- Primary: Application logs + system metrics + error traces
- Expert: Documentation of recent changes + runbooks
- Behavioral: Reproducible test case that triggers the same error

**Reproduction Artifact**: Minimal failing test case + exact log sequence that demonstrates root cause

## Evolution Notes

- As agent uses this skill, watch for patterns in what gets researched
- Might evolve into specialty research: "fact-checker", "trend-analyzer", "code-analyzer", "hypothesis-tester"
- Opportunity: Build cached research archive for repeated questions (user decides if worth it)
- Feedback loop: Track which research findings turn into memory; improve research heuristics
- Monitor SAT effectiveness: Are competing hypotheses catching blind spots? Is Two-Source Rule preventing false conclusions?
- Red team effectiveness: How often does devil's advocacy flip a conclusion?

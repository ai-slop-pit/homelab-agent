# Skill: Gemini CLI — Web Research & Context Offload

## Overview
Gemini CLI enables the agent to independently access web information, conduct research, summarize findings, and offload context processing—without requiring user involvement. This skill makes the agent autonomous in information gathering and analysis.

## What This Skill Enables

### 1. Context Offloading
Instead of burdening the main context with information lookup, delegate to Gemini:
- Agent asks Gemini for web research
- Gets synthesized answer
- Incorporates only relevant findings
- Keeps main context clean and focused

### 2. Web Access
Direct connection to current web information:
- Current facts (APIs, versions, releases)
- Recent news and updates
- Technical documentation
- Best practices and guides
- External perspectives and analysis

### 3. Independent Summarization
Gemini can synthesize complex information:
- Reduce verbose web results to key points
- Extract actionable insights
- Compare multiple sources
- Synthesize diverse perspectives into conclusions
- Create structured summaries

### 4. Autonomous Analysis
Agent can conduct research without asking user:
- Comparative analysis (tool A vs tool B)
- Feasibility assessment (can we do X?)
- Best practice research (how should we approach Y?)
- Problem investigation (why is Z failing?)
- Trend analysis (what's the state of X in 2026?)

## Why This Matters

**Before**: Agent hits context limits, needs user to look up external info, workflow is blocked  
**After**: Agent independently researches, summarizes, incorporates findings, continues work

Agent becomes **fully autonomous** for information needs.

## Core Usage

```bash
# Simple web research
gemini "what is the latest Node.js LTS version"

# Comparative analysis
gemini --model "gemini-3.1-pro" "compare Kubernetes vs Docker Swarm with pros/cons"

# Summarization of complex topic
gemini "summarize the key features of Python asyncio in 3 paragraphs"

# Feasibility assessment
gemini "is it feasible to migrate from PostgreSQL to MongoDB for a 50M row dataset"

# Problem investigation
gemini "why would SSH connections timeout intermittently and how to debug"
```

## Models Available (May 2026)

| Model | Best For |
|-------|----------|
| **3.5 Flash** | General research, agentic tasks, fast synthesis (DEFAULT) |
| **3.5 Pro** | Complex reasoning, deep analysis (early access) |
| **3.1 Pro** | High-stakes decisions, detailed reasoning |
| **3.1 Flash-Lite** | Ultra-fast lookups when speed is critical |

## How Agent Uses This Skill

**Autonomously**, whenever:
1. Needing external information not in local knowledge
2. Requiring current facts/updates
3. Needing comparative analysis
4. Doing complex research or investigation
5. Summarizing external content
6. Assessing feasibility of approaches
7. Understanding trends or best practices

Agent calls Gemini, processes result, incorporates into response.

**No user involvement needed.** Offload complete.

## Integration with Agent Architecture

- **Context offload**: Heavy research delegated to Gemini, not kept in main context
- **Autonomous operation**: Agent doesn't ask "should I research?" — it researches when needed
- **Synthesis capability**: Gemini synthesizes complex findings into actionable insights
- **Speed**: Faster than user googling, faster than including raw web content in context

---

**Core value**: Agent becomes autonomous in information access, analysis, and synthesis. Main context stays lean. Work flows uninterrupted.

# Research & Context Access Skill

## Core: Gemini CLI for Web Research

**Primary tool**: `gemini` command — Web research, current information, external context

```bash
gemini "your question"
```

## Model Selection

Choose the right Gemini model for the task:

```bash
# Latest (default) - optimized for agents
gemini --model "gemini-3.5-flash" "research question"

# Deep reasoning for complex analysis
gemini --model "gemini-3.1-pro" "complex analysis needed"

# Ultra-fast for quick lookups
gemini --model "gemini-3.1-flash-lite" "quick lookup"

# Default/current best
gemini "your question"
```

### Available Models (May 2026)

| Model | Best For |
|-------|----------|
| **3.5 Flash** | Agentic tasks, research, software engineering (LATEST) |
| **3.5 Pro** | Deep analysis (early access, June release) |
| **3.1 Pro** | Complex reasoning, high-stakes analysis |
| **3.1 Flash-Lite** | Speed, low-latency, quick facts |
| **3 Flash** | Standard workhorse for production |

## When to Use Gemini

- Look up current facts, APIs, versions
- Research topics with recent updates
- Get external context and perspectives
- Access information beyond local knowledge
- Analyze web content

## Examples

```bash
# Use latest 3.5 Flash (optimized for agents like you)
gemini "latest Node.js LTS version"

# Complex analysis - use 3.1 Pro
gemini --model "gemini-3.1-pro" "compare Kubernetes vs Docker Swarm"

# Quick lookup - use Flash-Lite
gemini --model "gemini-3.1-flash-lite" "Python asyncio documentation"

# Deep reasoning for critical work
gemini --model "gemini-3.1-pro" "best practices for production Kubernetes"
```

## How Agent Uses It

Whenever needing external information:
1. Recognize info is beyond local knowledge
2. Pick the right model (3.5 Flash for general, 3.1 Pro for analysis)
3. Call `gemini [--model MODEL] "question"`
4. Get web-powered answer
5. Incorporate into response

**Organic usage** — choose model based on task needs.

## Setup

Ensure gemini CLI works:
```bash
gemini "test query"
# If trust error, use:
export GEMINI_CLI_TRUST_WORKSPACE=true
gemini "query"
```

---

**That's it.** Gemini 3.5 Flash is optimized for agents. Use it for research.

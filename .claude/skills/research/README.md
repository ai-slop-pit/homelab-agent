# Research & Context Access Skill

## Core: Gemini CLI for Web Research

**Primary tool**: `gemini` command — Web research, current information, external context

```bash
gemini "your question"
```

## When to Use Gemini

- Look up current facts, APIs, versions
- Research topics with recent updates
- Get external context and perspectives
- Access information beyond local knowledge
- Analyze web content

## Examples

```bash
# Current information
gemini "what is the latest Node.js LTS version"

# External context
gemini "how does tmux differ from screen"

# Recent updates
gemini "Kubernetes 1.31 new features"

# API documentation
gemini "Claude API prompt caching documentation"

# Best practices
gemini "production deployment best practices for Go"
```

## How Agent Uses It

Whenever needing external information:
1. Recognize info is beyond local knowledge
2. Call `gemini "question"`
3. Get web-powered answer
4. Incorporate into response

**Organic usage** — not forced, just when genuinely needed.

## Setup

Ensure gemini CLI works:
```bash
gemini "test query"
# If trust error, use:
export GEMINI_CLI_TRUST_WORKSPACE=true
gemini "query"
```

---

**That's it.** Gemini is the external context tool. Use it when you need current information beyond what's local.

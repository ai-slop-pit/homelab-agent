# Research Offloading Skill

Intelligently offload research queries to Gemini models with **web search enabled**, returning compressed summaries to reduce context token consumption in Claude Code. Searches both local knowledge and real-time web sources.

## Syntax

```
/research <query>
```

## Features

- **Web Search Enabled**: Queries both local knowledge + real-time web sources
  - Uses Gemini's built-in `google_web_search` tool
  - Includes citations and source URLs
  - Reduces hallucinations with web grounding

- **Automatic Model Routing**: Routes based on query complexity
  - Light queries → Gemini 3.5 Flash (fast web search)
  - Medium queries → Gemini 3.5 Flash (multi-source research)
  - Heavy research → Deep Research Preview (comprehensive synthesis + web)

- **Context Optimization**: Returns only summarized findings, not raw research
- **Gemini CLI Native**: Uses `gemini` CLI directly (no API key management needed)
- **Source Attribution**: Includes web sources and citations for verification

## Model Selection Strategy

| Query Type | Model | Best For |
|-----------|-------|----------|
| **Light** (< 100 chars, simple) | Gemini 3.5 Flash | Quick facts, API docs, simple summaries |
| **Medium** (100-500 chars, analysis) | Gemini 3.5 Flash | Code reviews, comparisons, API analysis |
| **Heavy** (> 500 chars, comprehensive) | Deep Research | Market research, trend analysis, synthesis |

## Examples

```
/research What are the latest Gemini 3.5 Flash pricing models?
→ Returns: Summarized pricing table + model comparison

/research Compare React 18 vs Vue 3 for state management
→ Returns: Feature comparison table + recommendations

/research Analyze trends in AI model efficiency 2024-2026
→ Returns: Deep Research synthesis of findings
```

## Implementation Details

The skill:
1. Detects query complexity (length, keywords, scope)
2. Routes to appropriate Gemini model via CLI
3. Processes response with summary extraction
4. Returns **compressed output only** back to Claude Code
5. Logs research queries for pattern matching

## Supported Models

- `gemini-3.5-flash` — Recommended for most tasks
- `gemini-3.1-pro` — For reasoning-heavy queries
- `google-deepresearch-1.0` — For comprehensive research
- `gemini-2.5-flash` — Fallback (older model)

## Token Savings

- Light queries: ~60-70% token reduction vs. native research
- Medium queries: ~40-50% token reduction
- Heavy queries: ~80%+ token reduction (raw data stays in Gemini)

## Notes

- Requires `gemini` CLI installed (`which gemini`)
- Uses gcloud authentication (no API key needed)
- Results cached per unique query pattern
- Async processing for deep research (returns when complete)

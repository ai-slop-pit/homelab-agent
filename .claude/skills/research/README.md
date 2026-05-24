# /research Skill — Quick Reference

Offload research queries to Gemini to reduce Claude Code context token consumption.

## Usage

```bash
/research <your research query>
```

## Examples

### Light Queries (instant)
```bash
/research What is OAuth 2.0?
/research Node.js best practices
/research API rate limiting strategies
```

### Medium Queries (1-3 seconds)
```bash
/research Compare Redis vs Memcached
/research Explain microservices architecture
/research What are the OWASP top 10 security risks?
```

### Heavy Research (5-30 seconds)
```bash
/research Analyze current trends in LLM efficiency and cost optimization
/research Comprehensive comparison of CSS-in-JS solutions
/research Research the evolution of JavaScript async patterns
```

## Features

✅ **Automatic complexity detection** — Routes to appropriate Gemini model  
✅ **Context optimization** — Returns summaries, not raw data  
✅ **Query logging** — All queries logged to `logs/research-<date>.log`  
✅ **No API key needed** — Uses Gemini CLI with gcloud auth  

## How Complexity is Detected

The skill automatically determines complexity based on:

| Factor | Light | Medium | Heavy |
|--------|-------|--------|-------|
| **Length** | < 100 chars | 100-500 chars | > 500 chars |
| **Keywords** | Basic lookup | compare, explain | analyze, research, comprehensive |
| **Scope** | Single topic | Multiple topics | Multi-faceted analysis |

## Token Savings

Compared to asking Claude Code directly:
- **Light**: 60-70% reduction
- **Medium**: 40-50% reduction
- **Heavy**: 80%+ reduction

## How It Works

1. You call `/research <query>`
2. Script detects complexity level
3. Routes to appropriate Gemini model via CLI
4. Returns summarized response to Claude Code
5. Query logged for pattern analysis

## Models Used

- **Gemini Flash** (default, fastest)
- **Gemini Pro** (reasoning-heavy queries)
- **Deep Research** (comprehensive synthesis)

## Troubleshooting

### "Gemini CLI unavailable"
- Ensure you have `gemini` CLI installed: `which gemini`
- Check authentication: `gcloud auth login`

### Slow responses
- Heavy research can take 30+ seconds
- Light queries should return in < 2 seconds
- Check your internet connection

### No output
- Run with `GEMINI_CLI_TRUST_WORKSPACE=true` (script does this automatically)

## Configuration

Edit `research.sh` to:
- Change complexity thresholds
- Modify routing logic
- Adjust timeouts

## See Also

- [SKILL.md](SKILL.md) — Full skill documentation
- [.learnings/research-skill.md](../../.learnings/research-skill.md) — Implementation notes

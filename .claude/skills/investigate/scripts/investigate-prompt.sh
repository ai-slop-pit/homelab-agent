#!/bin/bash
# Build structured investigation prompt for Gemini CLI
# Usage: investigate-prompt.sh 'What is the current Docker version?' '[optional context]'

QUESTION="${1:-}"
CONTEXT="${2:-}"

if [ -z "$QUESTION" ]; then
  echo "Usage: investigate-prompt.sh 'Question?' '[optional context]'" >&2
  exit 1
fi

# Build the prompt
cat <<'PROMPT'
Investigate and validate the following question.

PROMPT
echo "QUESTION: $QUESTION"
if [ -n "$CONTEXT" ]; then
  echo "CONTEXT: $CONTEXT"
fi

cat <<'PROMPT'

REQUIREMENTS:
1. Search for current, factual information (don't rely on training data)
2. Validate EVERY claim with 2+ independent sources
3. List sources explicitly with URLs or citations
4. Flag ANY contradictions between sources
5. Assess confidence for each finding: High (2+ sources agree) / Medium (1 primary + 1 expert) / Low (single source)

RETURN FORMAT:

## Findings
[Finding 1]: [exact statement]
  - Source 1: [URL/citation] - [what it confirms]
  - Source 2: [URL/citation] - [what it confirms]
  - Confidence: [High/Medium/Low]

## Sources
- [URL] - [domain, what it provides]

## Contradictions (if any)
[Which sources disagree and how]

IMPORTANT:
- Do NOT assume knowledge. Search even for "common knowledge"
- Do NOT cite the same source twice under different names
- Enforce 2-source rule strictly
- Flag uncertainty explicitly
PROMPT

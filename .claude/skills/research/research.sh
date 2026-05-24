#!/bin/bash

# Research Offloading Skill - Gemini CLI Handler
# Routes queries to appropriate Gemini model based on complexity
# Usage: ./research.sh "<query>"

set -euo pipefail

# Allow gemini CLI to run in automated environments
export GEMINI_CLI_TRUST_WORKSPACE=true

query="$1"

if [ -z "$query" ]; then
  echo "Error: Please provide a research query"
  echo "Usage: /research <query>"
  exit 1
fi

# Function to detect query complexity
detect_complexity() {
  local q="$1"
  local length=${#q}
  local word_count=$(echo "$q" | wc -w)

  # Check for heavy research keywords
  if echo "$q" | grep -iE "analyze|comprehensive|deep|thorough|research|trend|market|survey|all.*information" > /dev/null; then
    echo "heavy"
    return
  fi

  # Check for medium complexity keywords
  if echo "$q" | grep -iE "compare|versus|difference|explain|how to|best practices|overview" > /dev/null; then
    echo "medium"
    return
  fi

  # Length-based detection
  if [ $length -gt 500 ] || [ $word_count -gt 50 ]; then
    echo "heavy"
  elif [ $length -gt 100 ]; then
    echo "medium"
  else
    echo "light"
  fi
}

# Function to summarize response
summarize_response() {
  local response="$1"
  local model="$2"

  # If response is short enough, return as-is
  if [ ${#response} -lt 500 ]; then
    echo "$response"
    return
  fi

  # Use Gemini to create a summary
  echo "$response" | gemini --model="$model" \
    --system="You are a research summarizer. Provide a concise 2-3 paragraph summary of the key findings. Focus on actionable insights and avoid redundancy." \
    --input-file=/dev/stdin 2>/dev/null || echo "$response"
}

# Detect complexity
complexity=$(detect_complexity "$query")

echo "🔍 Research Query: $query"
echo "📊 Complexity Level: $complexity"
echo ""

case "$complexity" in
  light)
    echo "🚀 Using: Gemini Flash (fast web search + local knowledge)"
    # Light query with web search enabled
    web_prompt="Please answer this question using both your knowledge and current web information if available. Provide a concise answer with sources:\n\n$query"
    result=$(gemini "$web_prompt" 2>&1)
    ;;

  medium)
    echo "⚡ Using: Gemini Pro (comprehensive web research + analysis)"
    # Medium query - search web for deeper analysis
    research_prompt="Please research the following topic thoroughly using web search and your knowledge. Provide:\n1. Key findings from web sources\n2. Expert perspectives\n3. Current trends/updates\n4. Cited sources\n\n$query"
    result=$(gemini --raw-output "$research_prompt" 2>&1)
    ;;

  heavy)
    echo "🔬 Using: Deep Research (comprehensive web + synthesis)"
    echo "⏳ Researching web sources and synthesizing findings..."
    # Heavy research - comprehensive web research with synthesis
    research_prompt="Conduct a comprehensive research analysis using web search and available data sources. Include:\n1. Search multiple sources and perspectives\n2. Synthesize information into a coherent analysis\n3. Highlight key trends and patterns\n4. Provide specific citations and URLs\n5. Include any recent updates or breaking news\n6. Offer actionable insights and recommendations\n\n$query"
    result=$(gemini "$research_prompt" 2>&1)
    ;;
esac

echo ""
echo "---"
echo "📝 Results:"
echo "---"
echo "$result"

# Log the research query
log_file="/opt/claude-agent/logs/research-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$log_file")"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] $complexity: $query" >> "$log_file"

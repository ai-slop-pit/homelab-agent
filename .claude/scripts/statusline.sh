#!/bin/bash
# Claude Code minimal status line - clean functional design
# Format: repo | model | context% | rate%

input=$(cat)

# Extract only what we need
repo=$(echo "$input" | jq -r '.workspace.repo.name // empty')
model=$(echo "$input" | jq -r '.model.display_name // empty' | sed 's/^Claude //' | sed 's/ .*$//')
ctx=$(echo "$input" | jq -r '.context_window.used_percentage // empty' | xargs printf '%.0f')
five_hr=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty' | xargs printf '%.0f')

# Build status line: repo | model | ctx% | 5h%
status=""
[ -n "$repo" ] && status="${repo}"
[ -n "$model" ] && status="${status} | ${model}"
[ -n "$ctx" ] && status="${status} | ${ctx}% ctx"
[ -n "$five_hr" ] && status="${status} | ${five_hr}% 5h"

printf '%s\n' "$status"

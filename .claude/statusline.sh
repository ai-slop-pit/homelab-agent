#!/usr/bin/env bash
set -euo pipefail

input=$(cat)
get() { jq -r "$1 // empty" <<<"$input"; }

model=$(get '.model.display_name')
cwd=$(get '.workspace.current_dir')
[[ -z "$cwd" ]] && cwd=$(get '.cwd')
duration_ms=$(get '.cost.total_duration_ms')
cost_usd=$(get '.cost.total_cost_usd')
lines_added=$(get '.cost.total_lines_added')
lines_removed=$(get '.cost.total_lines_removed')
transcript=$(get '.transcript_path')

cwd_short="${cwd##*/}"

branch=""
if [[ -n "$cwd" && -d "$cwd" ]]; then
  branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" rev-parse --short HEAD 2>/dev/null || echo "")
fi

duration_str=""
if [[ "$duration_ms" =~ ^[0-9]+$ ]]; then
  s=$(( duration_ms / 1000 )); m=$(( s / 60 )); h=$(( m / 60 ))
  if   (( h > 0 )); then duration_str=$(printf '%dh%02dm' "$h" "$(( m % 60 ))")
  elif (( m > 0 )); then duration_str=$(printf '%dm%02ds' "$m" "$(( s % 60 ))")
  else                   duration_str=$(printf '%ds' "$s"); fi
fi

lines_added=${lines_added:-0}
lines_removed=${lines_removed:-0}

cost_str=""
[[ -n "$cost_usd" ]] && cost_str=$(printf '$%.2f' "$cost_usd")

# Build output
out="${model}"
[[ -n "$cwd_short" ]] && out+=" | ${cwd_short}"
[[ -n "$branch" ]] && out+=" | ${branch}"
[[ -n "$duration_str" ]] && out+=" | ${duration_str}"
if (( lines_added > 0 || lines_removed > 0 )); then
  out+=" | +${lines_added}/-${lines_removed}"
fi
[[ -n "$cost_str" ]] && out+=" | ${cost_str}"

printf '%s' "$out"

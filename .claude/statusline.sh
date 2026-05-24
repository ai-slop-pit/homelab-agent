#!/bin/bash
# Claude Code professional status line
# Reads JSON from stdin and prints a formatted, multi-section status line

input=$(cat)

# ── Colors ──────────────────────────────────────────────────────────────
RESET='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

# Foreground
BLACK='\033[30m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
MAGENTA='\033[35m'
CYAN='\033[36m'
WHITE='\033[37m'

BRED='\033[91m'
BGREEN='\033[92m'
BYELLOW='\033[93m'
BBLUE='\033[94m'
BMAGENTA='\033[95m'
BCYAN='\033[96m'
BWHITE='\033[97m'

# Separators (using middle dot for cleaner look)
SEP="${DIM}•${RESET}"

# ── Extract JSON fields ──────────────────────────────────────────────────
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
[ -z "$cwd" ] && cwd=$(pwd)

model=$(echo "$input" | jq -r '.model.display_name // empty')
version=$(echo "$input" | jq -r '.version // empty')

used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
remaining_pct=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // empty')

five_hr=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
seven_day=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')

effort=$(echo "$input" | jq -r '.effort.level // empty')
thinking=$(echo "$input" | jq -r '.thinking.enabled // empty')
vim_mode=$(echo "$input" | jq -r '.vim.mode // empty')
output_style=$(echo "$input" | jq -r '.output_style.name // empty')

session_name=$(echo "$input" | jq -r '.session_name // empty')
repo_owner=$(echo "$input" | jq -r '.workspace.repo.owner // empty')
repo_name=$(echo "$input" | jq -r '.workspace.repo.name // empty')
git_worktree=$(echo "$input" | jq -r '.workspace.git_worktree // empty')

pr_number=$(echo "$input" | jq -r '.pr.number // empty')
pr_state=$(echo "$input" | jq -r '.pr.review_state // empty')

agent_name=$(echo "$input" | jq -r '.agent.name // empty')
worktree_branch=$(echo "$input" | jq -r '.worktree.branch // empty')

# ── Timestamp ────────────────────────────────────────────────────────────
timestamp=$(date +%H:%M:%S)

# ── Git info (from actual cwd) ───────────────────────────────────────────
git_branch=""
git_dirty=""
git_ahead=""
if git -C "$cwd" rev-parse --git-dir >/dev/null 2>&1; then
  git_branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null \
               || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
  # Prefer worktree branch from JSON if available
  [ -n "$worktree_branch" ] && git_branch="$worktree_branch"
  # Dirty check (index + working tree, no lock needed)
  if ! git -C "$cwd" diff --quiet 2>/dev/null \
     || ! git -C "$cwd" diff --cached --quiet 2>/dev/null; then
    git_dirty="*"
  fi
  # Untracked files
  if [ -n "$(git -C "$cwd" ls-files --others --exclude-standard 2>/dev/null | head -1)" ]; then
    git_dirty="${git_dirty}?"
  fi
  # Ahead/behind upstream
  upstream=$(git -C "$cwd" rev-parse --abbrev-ref '@{upstream}' 2>/dev/null)
  if [ -n "$upstream" ]; then
    ahead=$(git -C "$cwd" rev-list --count "@{upstream}..HEAD" 2>/dev/null)
    behind=$(git -C "$cwd" rev-list --count "HEAD..@{upstream}" 2>/dev/null)
    [ "${ahead:-0}" -gt 0 ] 2>/dev/null && git_ahead="+${ahead}"
    [ "${behind:-0}" -gt 0 ] 2>/dev/null && git_ahead="${git_ahead}-${behind}"
  fi
fi

# ── Short cwd (replace $HOME with ~) ────────────────────────────────────
home_dir=$(eval echo "~$(whoami)")
short_cwd="${cwd/#$home_dir/\~}"

# ── Section builder ──────────────────────────────────────────────────────
# We accumulate segments and join them with the separator

LINE=""
add() {
  # add <segment_string>
  [ -z "$1" ] && return
  if [ -z "$LINE" ]; then
    LINE="$1"
  else
    LINE="${LINE} ${SEP} $1"
  fi
}

# ── SECTION 1: Location & path ───────────────────────────────────────────
loc_seg=""
if [ -n "$repo_name" ]; then
  loc_seg="${BOLD}${BBLUE}${repo_name}${RESET}"
else
  loc_seg="${BOLD}${BBLUE}$(basename "$cwd")${RESET}"
fi
loc_seg="${loc_seg} ${DIM}${short_cwd}${RESET}"
add "$loc_seg"

# ── SECTION 2: Model ──────────────────────────────────────────────────────
if [ -n "$model" ]; then
  add "${BCYAN}${model}${RESET}"
fi

# ── SECTION 3: Context window ──────────────────────────────────────────────
if [ -n "$used_pct" ]; then
  used_int=$(printf '%.0f' "$used_pct")
  if [ "$used_int" -ge 80 ] 2>/dev/null; then
    ctx_color="${BRED}"
  elif [ "$used_int" -ge 50 ] 2>/dev/null; then
    ctx_color="${BYELLOW}"
  else
    ctx_color="${BGREEN}"
  fi
  ctx_seg="${ctx_color}${used_int}%${RESET}"
  add "$ctx_seg"
fi

# ── Output ───────────────────────────────────────────────────────────────
printf '%b\n' "$LINE"

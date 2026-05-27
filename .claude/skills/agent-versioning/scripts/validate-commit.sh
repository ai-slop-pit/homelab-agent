#!/bin/bash
# validate-commit.sh - Validate commit message format before committing
# Usage: validate-commit.sh "commit message"
# Or integrate into .git/hooks/prepare-commit-msg

set -e

COMMIT_MSG="${1:-}"

if [ -z "$COMMIT_MSG" ]; then
    echo "Usage: validate-commit.sh \"commit message\""
    exit 1
fi

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Extract commit type (before colon)
TYPE=$(echo "$COMMIT_MSG" | cut -d: -f1)
SUMMARY=$(echo "$COMMIT_MSG" | cut -d: -f2- | sed 's/^ //')

# Valid types
VALID_TYPES=("feat" "fix" "refactor" "docs" "chore")

# Check if type is valid
is_valid_type=0
for valid_type in "${VALID_TYPES[@]}"; do
    if [ "$TYPE" = "$valid_type" ]; then
        is_valid_type=1
        break
    fi
done

# Validation checks
ERRORS=0

# Check format: type: summary
if ! echo "$COMMIT_MSG" | grep -qE "^(feat|fix|refactor|docs|chore): .+"; then
    echo -e "${RED}✗ Invalid format${NC}"
    echo "  Expected: <type>: <summary>"
    echo "  Valid types: feat, fix, refactor, docs, chore"
    echo "  Example: feat: Add new feature"
    echo "  Got: $COMMIT_MSG"
    ERRORS=$((ERRORS + 1))
fi

# Check summary is not empty
if [ -z "$SUMMARY" ]; then
    echo -e "${RED}✗ Summary cannot be empty${NC}"
    echo "  Format: <type>: <summary>"
    ERRORS=$((ERRORS + 1))
fi

# Check summary under 50 chars
SUMMARY_LEN=${#SUMMARY}
if [ $SUMMARY_LEN -gt 50 ]; then
    echo -e "${YELLOW}⚠ Summary is ${SUMMARY_LEN} chars (target: <50)${NC}"
    echo "  $SUMMARY"
fi

# Check for secrets
if echo "$COMMIT_MSG" | grep -iE "api_key|password|secret|token|auth.*=|key.*=" > /dev/null; then
    echo -e "${RED}✗ Potential secret detected in commit message${NC}"
    echo "  Remove sensitive data before committing"
    ERRORS=$((ERRORS + 1))
fi

# Report results
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Commit message is valid${NC}"
    exit 0
else
    echo -e "${RED}✗ Commit message validation failed${NC}"
    exit 1
fi

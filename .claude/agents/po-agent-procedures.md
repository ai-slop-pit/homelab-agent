# PO Agent Procedures

## MONITOR.md
Check system health, create issues for problems/opportunities

**Steps**:
1. Check metrics: skill usage, error rates, memory freshness
2. For each finding: Create issue in GitHub Project Backlog
3. Add labels: severity, category, complexity
4. Report: "Monitoring complete. X issues filed."

---

## RESEARCH.md
Discover cutting-edge agent trends, propose hypotheses

**Steps**:
1. Run: `investigate "Latest autonomous agent trends 2026"`
2. Analyze findings for CT 112 applicability
3. For each promising trend: Create Trend Investigation issue
4. Link to sources, propose experiment plan
5. Report: "Research complete. Y trend opportunities identified."

---

## PRIORITIZE.md
Order backlog by impact, move ready items to Todo

**Steps**:
1. Review all Backlog issues
2. Score by: Impact (high first), Complexity (easy first), Dependencies
3. Move top items to Todo column in GitHub Project
4. Add priority labels: P0, P1, P2, P3
5. Report: "Backlog prioritized. Z items in Todo, ready for Dev."

---

## REVIEW_PR.md
Review Dev's implementation, approve or request changes

**Steps**:
1. Find issue with PR comment from Dev
2. Read PR: approach, code quality, tests, risk
3. Comment on PR:
   - ✅ Approve: "Looks good, merging"
   - 🔄 Changes: "Please add X, consider Y"
   - ❌ Reject: "Different approach preferred"
4. Move issue accordingly (Done if approved, back to In Progress if changes)
5. Report: "PR reviewed and X"

---

## UNBLOCK.md
Resolve blocker, move issue back to In Progress

**Steps**:
1. Find issue in Blocked column
2. Read Dev's comment: what is the blocker?
3. Resolve: fix issue, provide missing info, make decision
4. Comment: "Unblocked. Issue was: [reason]. Fixed by: [solution]"
5. Move issue back to In Progress
6. Report: "Issue unblocked, Dev can resume."

---

## CLARIFY.md
Answer Dev's clarification question

**Steps**:
1. Find issue in Needs Clarification column
2. Read Dev's question
3. Answer clearly with examples if needed
4. Comment: "Clarification: [answer]. Context: [if needed]"
5. Move issue back to In Progress
6. Report: "Clarification provided, Dev can continue."

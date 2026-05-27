# Dev Agent Procedures

## POLL.md
Check Todo column, claim unassigned issue

**Steps**:
1. Query GitHub Project: issues in Todo column, not assigned
2. For each issue: read title, description, acceptance criteria
3. Decide: can I implement this? (scope, clarity, tools)
4. Claim: comment "Taking this on", move to In Progress
5. If no issues: report "No Todo items, standby"
6. Report: "Issue #X claimed, starting implementation"

---

## IMPLEMENT.md
Work on claimed issue, handle blockers/clarifications

**Critical Decision Points**:
1. **Can I proceed?** NO → move to Blocked
2. **Need user input?** YES → move to Needs User Approval
3. **Breaking change?** YES → move to Needs User Approval
4. Otherwise → proceed with code

**Steps**:
1. Create branch: `feature/<issue-number>-<title>`
2. Implement: write code, update docs, follow patterns
3. Test: run tests, manual validation, check for breaks
4. Handle decisions:
   - If blocker: move to Blocked, comment with reason, stop
   - If unclear: move to Needs Clarification, comment with question, stop
   - If big change: move to Needs User Approval, comment with impact, stop
5. If all clear: commit code atomically
6. Report: "Implementation complete, ready for PR"

---

## CREATE_PR.md
Create PR, comment on issue, notify PO

**Steps**:
1. Push feature branch to GitHub
2. Create PR with template:
   ```
   ## What
   [Summary]
   
   ## Closes
   Closes #XXX
   
   ## Testing
   - [ ] Tests pass
   - [ ] Manual verification done
   - [ ] No breaking changes
   
   ## Risk
   [Low/Medium/High]
   ```
3. Move issue to In Review
4. **Comment on issue**:
   - "Task complete. Implementation: PR #XXX"
   - This notifies PO that Dev is done
5. Report: "PR #XXX created, awaiting PO review"

---

## RESPOND_TO_FEEDBACK.md
Handle PO comments on PR

**Steps**:
1. Monitor PR for PO comments
2. If changes requested:
   - Update code, commit: "Address feedback: [desc]"
   - Comment: "Updated per feedback"
3. If approved:
   - Merge PR (or let PO merge)
4. If rejected:
   - Understand reason
   - Move issue back to Backlog
   - Comment: "Issue deprioritized"
5. Report: "PR updated/merged/closed"

---

## HANDLE_BLOCKER.md
Report blocker clearly, move to Blocked

**Steps**:
1. Identify blocker type: missing dependency, PO decision, system limit, external service
2. Move issue to Blocked
3. Comment on issue:
   ```
   ⛔ Blocked: [Clear title]
   
   Reason: [Detailed explanation]
   
   What's needed to unblock:
   - [Action PO must take]
   - [Info needed]
   
   @PO-Agent
   ```
4. Wait for PO to unblock
5. Report: "Issue blocked, awaiting PO resolution"

---

## HANDLE_CLARIFICATION.md
Request requirement clarification

**Steps**:
1. Identify what's unclear
2. Move issue to Needs Clarification
3. Comment on issue:
   ```
   ❓ Clarification Needed
   
   Requirement: [What doesn't make sense?]
   
   Questions:
   - [Q1]
   - [Q2]
   
   @PO-Agent
   ```
4. Wait for PO answer
5. When clarified, PO moves back to In Progress
6. Report: "Awaiting clarification from PO"

---

## HANDLE_USER_APPROVAL.md
Request user approval for big/breaking changes

**Steps**:
1. Detect: breaking change, high-risk, major decision
2. Move issue to Needs User Approval
3. Comment with analysis:
   ```
   ⚠️ Needs User Approval - Breaking Change
   
   Type: [Breaking API / System restart / Data migration / etc]
   
   Impact:
   - [Impact 1]
   - [Impact 2]
   - Mitigation: [if possible]
   
   Request: [What should I do? Approve? Modify scope?]
   
   @User (awaiting approval)
   ```
4. Wait for user to respond in comment
5. User manually moves back to In Progress when ready
6. Dev continues with implementation
7. Report: "Awaiting user approval"

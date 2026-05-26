# Monitoring Skill Effectiveness

**When to use this: Skill deployed. Is it working? How can it improve?**

## Procedure: Track & Evolve

**When**: Skill has been in use for 2+ weeks; evaluate effectiveness.

**Monitoring Heuristics**:
1. **Usage frequency**: How often is the skill invoked?
   - Log each use (implicit or explicit)
   - Frequency threshold: Skill proven if used 5+ times/month
   
2. **Problem resolution rate**: Does it solve the target problem?
   - On success: User confirms fix or improvement
   - On failure: Procedure needs refinement
   
3. **User feedback**: Does the skill feel useful?
   - Is it faster than manual approach?
   - Do procedures match real-world scenarios?
   - Are examples still relevant?
   
4. **Scope creep detection**: Is the skill growing beyond original design?
   - Original scope: diagnose app failures
   - Scope creep: "Can it also fix them automatically?"
   - Decision: New skill or procedure extension?

## Effectiveness Signals

**Strong signals** (skill is working):
- ✓ Used 5+ times/month
- ✓ User reports "this saved time"
- ✓ Procedure examples remain relevant
- ✓ No requests for out-of-scope features

**Weak signals** (skill needs refinement):
- ✗ Used only 1-2 times/month
- ✗ User bypasses skill for manual approach
- ✗ Procedures are vague or outdated
- ✗ Multiple requests for clarification

## Evolution Triggers

**When to refine**:
1. **Procedure update**: Real-world scenario differs from documented example
2. **New procedure**: Repeated request for capability not in routing table
3. **Scope adjustment**: Clear boundary between this skill and related ones
4. **Deprecation**: Skill solved temporary problem; no longer needed

**Example Evolution**:
- Original: app-health-monitor diagnoses failures
- Month 2: Users ask "can it fix them?" → Propose separate app-health-fixer skill
- Month 3: Monitoring reveals 80% of failures are disk space
  → Refine DIAGNOSE.md with disk space check as priority 1

## Monitoring Artifacts

Track in `logs/skill-monitor/`:
```
[YYYY-MM-DD] app-health-monitor
INVOCATIONS: 7 this month
SUCCESS_RATE: 6/7 (86%)
FEEDBACK: "Saved 30 min troubleshooting time on Jellyfin crash"
NEXT_REVIEW: 2026-06-27
EVOLUTION_NEEDED: Refine disk-space diagnostics
```

## When to Archive

**Deprecate a skill when**:
- Used 0 times in 90 days
- Functionality superseded by newer skill
- Problem was temporary (deployment-specific)
- User feedback: "Not useful"

Move to `skills/.archive/` with note explaining deprecation.

---

**Monitoring is continuous.** After initial 2-week evaluation, check monthly.

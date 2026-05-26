# Freshness Validation

**When memory gets stale or you need to verify facts are still accurate.**

## Procedure: Check & Refresh Staleness

**When**: Beginning of session OR after major task batch

**Steps**:
1. Load memory/MEMORY.md and check lastUpdated on all files
2. Calculate: age_days = today - lastUpdated
3. **Flag stale**:
   - Infrastructure/config: >30 days
   - Patterns & lessons: >60 days
   - Preferences & rules: >90 days
   - Historical incidents: >180 days
4. For stale infra files, **verify still accurate** (check IPs, services, mounts)
5. **Auto-rectify**: If verified, update lastUpdated = today
6. **Report**: "Memory freshness: X current, Y stale"

## Memory Freshness TTLs

- **Infrastructure** (IPs, services, mounts, configs): 30 days
- **Patterns & lessons learned**: 60 days
- **Preferences & rules**: 90 days
- **Historical incidents**: 180 days (then archive)
- **Setup artifacts**: 30 days (verify still accurate)

## Example

Found: memory/feedback_git_workflow.md lastUpdated: 2026-04-01 (56 days old)

**Action**:
1. Read the file
2. Verify: Is the rule still accurate?
3. If yes: Update lastUpdated = today
4. If no: Update facts + lastUpdated
5. Done

That's it. Keep memory fresh by spot-checking.

# Skills Framework: Auto-Evolving Toolkit

Skills are **discovered and grown through work**. When the agent identifies a reusable pattern, it proposes a new skill. Skills live in `skills/` and evolve based on execution feedback.

## Skill Lifecycle (From Task to Deployed Skill)

```
1. User Task → Execute → Succeed ✓
          ↓
2. Reflect: "Is this a pattern?"
          ↓
3. If yes → Extract Generic Problem
          ↓
4. Draft SKILL.md template
          ↓
5. Propose to user: "New skill: `app-health-monitor`? Estimated usefulness: High"
          ↓
6. Deploy → Monitor performance
          ↓
7. Evolve: Refine based on experience
```

## Current Skills
(See `skills/*/` for deployed skills)

## Skills Born from Work (Examples)
These started as one-off tasks, evolved to skills:

- **`app-health-monitor`** (when you say "check torrent")
  - Triggered by: App failure detection
  - Does: Monitors app vitality, detects silent failures, suggests fixes
  
- **`system-auditor`** (when you ask "what's wrong?")
  - Triggered by: Generic troubleshooting requests
  - Does: Systematically checks logs, metrics, configuration drifts
  - Evolved: Now runs proactively weekly, suggesting improvements

- **`learning-engine`** (when you do repeated manual tasks)
  - Triggered by: Pattern detection in logs
  - Does: Identifies repeated actions → proposes automations
  - Evolved: Maintains preference model, suggests workflows

## How New Skills Are Born
When you ask the agent to do something:
1. Agent completes the task
2. Reflects: "Is this a reusable pattern?" → YES
3. Distills: Extracts scope, triggers, procedure into SKILL.md
4. Proposes: "Shall I create skill `X` to handle this class of problem?"
5. Deploys: If approved (or auto-deployed for safe skills), adds to `skills/`
6. Monitors: Tracks effectiveness, suggests improvements

## Future Skills (To Emerge Naturally)
- **`predictor`**: Forecast failures before they happen
- **`optimizer`**: Continuous tuning for cost/latency/power
- **`security-auditor`**: Proactive security scanning + threat modeling
- **`capacity-planner`**: Forecast resource exhaustion, suggest upgrades
- **`synthesizer`**: Auto-generate new skills from learnings

## Skill Template (for new skills)

When proposing a new skill, include:
- **Name**: kebab-case, descriptive
- **Trigger**: When does the agent invoke this?
- **Inputs**: What does it need to work?
- **Outputs**: What does it produce?
- **Success criteria**: How do we know it worked?
- **Failure modes**: What can go wrong?
- **Learning goal**: What will we learn from running it?

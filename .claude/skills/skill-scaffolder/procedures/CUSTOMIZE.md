# Customizing Procedure Templates

**When to use this: Scaffold created. Now customize templates for specific procedures.**

## Procedure: Adapt Templates

**When**: SKILL.md is done; now filling in procedures/ with real content.

**Steps**:
1. Open `procedures/PROCEDURE-NAME.md` (template)
2. Replace sections with skill-specific content:
   - `[Task Name]` → Real task name
   - `[When to use]` → Actual trigger condition
   - `[Custom Section]` → Domain-specific steps
   - `[Real-World Scenario]` → Example from pattern
3. Keep structure: Heading + Description + Procedure + Example + Links
4. Verify: 40-50 lines per procedure

**Template sections to customize**:
```
# [Task Name or When Condition]           ← Replace with real name
**When to use this: [Brief description]** ← Replace with real condition

## Procedure: [Action Name]               ← Replace with real action
**When**: [Trigger]                       ← Replace with real trigger

**[Custom Section 1]**: [Content]         ← Add domain-specific sections
[Content specific to skill]

[Decision Tree / Steps / Heuristics]      ← Add skill-specific logic
1. Step 1
2. Step 2

## Example: [Real-World Scenario]         ← Real example from the pattern
**[Setup]**: [Context]
```
[Code/command/concrete detail]
```
```

## Example: Customizing `config-manager/procedures/DIFF.md`

**Template**:
```markdown
# [Task Name or When Condition]
**When to use this: [Brief description.]**

## Procedure: [Action Name]
**When**: [Trigger]

**[Custom Section]**: [Content]
```

**Customized**:
```markdown
# Comparing Configuration Files

**When to use this: You have two config versions and need to see what changed.**

## Procedure: Generate Config Diff

**When**: User asks to compare configs OR before applying new config

**Comparison approach**:
1. Identify old vs. new config location
2. Parse both (JSON/YAML/plain text)
3. Generate diff with context
4. Highlight breaking changes (red flag)

**Parse examples**:
- JSON: Extract keys, compare values
- YAML: Parse indent-aware structure
- Plain text: Line-by-line diff

## Example: Database Config Migration

**Setup**: Migrating PostgreSQL from 13→15
- Old config: `db-config-13.yaml`
- New config: `db-config-15.yaml`

**Diff output**:
```
- pool_size: 10
+ pool_size: 20

- ssl_mode: disable
+ ssl_mode: require    # BREAKING CHANGE: Connections will fail without SSL cert
```

**Analysis**: One breaking change detected → warn operator
```

**Result**: Procedure is now domain-specific and ready for use.

## After Customization

1. Test on real scenario (if available)
2. Adjust example if it doesn't match reality
3. Verify procedure solves the original problem
4. Move to VALIDATE (see [VALIDATE](VALIDATE.md))

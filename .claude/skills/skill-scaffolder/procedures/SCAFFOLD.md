# Creating a New Skill Scaffold

**When to use this: You have a new skill idea. Create the directory structure and SKILL.md.**

## Procedure: Scaffold Skill

**When**: Pattern detected; skill analysis complete; ready to build directory structure.

**Inputs**:
- Skill name (kebab-case): `skill-name`
- One-line description: What does it do?
- 2-3 use cases: Common scenarios
- 3-5 procedures: Tasks/procedures in routing table

**Steps**:
1. Create directory: `.claude/skills/<skill-name>/procedures/`
2. Generate SKILL.md with:
   - Frontmatter: `name`, `description`, `disable-model-invocation: false`
   - One-sentence identity
   - 2-3 essentials
   - Routing table (task → PROCEDURE-NAME.md)
   - Key principle (one sentence)
3. Create procedure template files (empty, ready for content):
   - `procedures/PROCEDURE-1.md`
   - `procedures/PROCEDURE-2.md`
   - etc.
4. Validate: Does SKILL.md alone help someone understand when/how to use this?

## Example: Scaffolding `config-manager` Skill

**Input**:
```
name: config-manager
description: Track, diff, and apply configuration changes across services.
use_cases: [
  "Compare config versions",
  "Apply config safely",
  "Rollback on failure"
]
procedures: [
  "DIFF",
  "APPLY",
  "ROLLBACK"
]
```

**Created structure**:
```
.claude/skills/config-manager/
├── SKILL.md (27 lines)
│   ---
│   name: config-manager
│   description: Track, diff, and apply config changes.
│   disable-model-invocation: false
│   ---
│   
│   # Config Manager
│   
│   **Compare, apply, and rollback configuration safely.**
│   
│   ## The Essentials
│   
│   ### 1. Diff Configuration
│   - Compare old vs. new config
│   - Show changes clearly
│   
│   ### 2. Apply Configuration
│   - Deploy changes to services
│   - Handle failures gracefully
│   
│   ## For Specific Tasks
│   
│   | Task | Read This |
│   |------|-----------|
│   | Compare configs | [DIFF](procedures/DIFF.md) |
│   | Deploy safely | [APPLY](procedures/APPLY.md) |
│   | Recover from failure | [ROLLBACK](procedures/ROLLBACK.md) |
│   
│   ## Key Principle
│   
│   **Compare before applying. Verify safety before deploying.**
│
└── procedures/
    ├── DIFF.md (template, ready for content)
    ├── APPLY.md (template, ready for content)
    └── ROLLBACK.md (template, ready for content)
```

**Result**: Empty skill ready for procedure content. Developer fills in DIFF.md, APPLY.md, ROLLBACK.md with real procedures.

## After Scaffolding

1. **Developer fills content**: Write each procedure (40-50 lines)
2. **Validate**: Test procedures on real scenarios
3. **Commit**: `git add .claude/skills/config-manager/; git commit -m "feat: Add config-manager skill"`
4. **Monitor**: Track usage and effectiveness (see [skill-creator → MONITOR](../../skill-creator/procedures/MONITOR.md))

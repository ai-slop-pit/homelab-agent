# Skill Directory Structure Standard

**How skills are organized. What each directory means.**

---

## Canonical Skill Layout

```
.claude/skills/<skill-name>/
├── SKILL.md                 # Entry point (frontmatter + essentials + routing)
├── procedures/              # How-to guides (one file per task)
│   ├── TASK-1.md
│   ├── TASK-2.md
│   └── TASK-3.md
├── templates/               # Reusable templates (optional)
│   ├── SKILL-template.md
│   └── procedure-template.md
├── examples/                # Concrete walkthroughs (optional)
│   ├── example-1.md
│   └── example-2.md
└── schemas/                 # Structured definitions (optional)
    └── inputs-outputs.json
```

---

## Directory Semantics

| Directory | Purpose | When Needed | Content |
|-----------|---------|------------|---------|
| **SKILL.md** (root) | Manifest + entry point | Always | Frontmatter, identity, essentials, routing table |
| **procedures/** | How-to guides | Always | One focused guide per task (40-50 lines each) |
| **templates/** | Reusable templates | When skills create/generate content | SKILL.md template, procedure template, artifact templates |
| **examples/** | Concrete walkthroughs | When procedure is abstract or complex | Real-world example, before/after, step-by-step demo |
| **schemas/** | Structured definitions | When skill has complex inputs/outputs | JSON Schema for inputs, expected outputs, data models |

---

## Size Guidelines

| File Type | Lines | Notes |
|-----------|-------|-------|
| SKILL.md | 25-30 | Essentials only; routing points elsewhere |
| Each procedure | 40-50 | Focused on one task; includes example |
| Each template | 20-40 | Reusable boilerplate; ready to copy |
| Each example | 30-60 | Real scenario; step-by-step walkthrough |
| Each schema | 20-40 | JSON/YAML; documented structure |
| **Total skill** | 250-400 | Everything combined |

---

## Minimal vs. Complex Skills

### Minimal Skill (Early Stage)
```
memory-manager/
├── SKILL.md                 # 22 lines
└── procedures/
    ├── FRESHNESS.md         # 40 lines
    ├── CONSOLIDATE.md       # 37 lines
    ├── ARCHIVE.md           # 40 lines
    ├── INDEX.md             # 38 lines
    └── AUTOSAVE.md          # 46 lines
Total: ~223 lines
```
**Rationale**: Simple, focused, everything essential.

### Complex Skill (Mature)
```
skill-creator/
├── SKILL.md                 # 26 lines
├── procedures/
│   ├── DETECT.md            # 48 lines
│   ├── ANALYZE.md           # 45 lines
│   ├── PROPOSE.md           # 65 lines
│   ├── IMPLEMENT.md         # 70 lines
│   └── MONITOR.md           # 70 lines
├── templates/
│   ├── SKILL-template.md    # 30 lines
│   └── procedure-template.md # 25 lines
├── examples/
│   ├── app-health-monitor.md # 50 lines
│   └── skill-discovery.md   # 50 lines
└── schemas/
    └── skill-metadata.json  # 35 lines
Total: ~514 lines (but agent only loads SKILL.md by default)
```
**Rationale**: Has templates for creating other skills; has examples of skills created using it; has schema for validation.

---

## Evolution Path

**Phase 1** (Discovery):
- Just SKILL.md + procedures/
- Focus: Does it work?

**Phase 2** (Maturity):
- Add templates/ if skill generates artifacts
- Add examples/ if procedures need concrete walkthrough
- Focus: Is it easy to use?

**Phase 3** (Specialization):
- Add schemas/ for validation
- Add tools/ for complex automation
- Focus: Can it be extended?

---

## Naming Conventions

**SKILL.md**: Always this name (manifest entry point)

**procedures/**: 
- Name after the task, not the step
- Use verbs: DIAGNOSE.md, SETUP.md, MONITOR.md
- NOT: PROCEDURE-1.md, STEP-1.md

**templates/**:
- Descriptive: SKILL-template.md, procedure-template.md
- Include: [INSTRUCTIONS] comments showing where to fill in

**examples/**:
- Scenario-based: app-health-monitor.md, stock-analyzer.md
- Real-world case that triggered skill creation

**schemas/**:
- Data-structure-focused: inputs-outputs.json, skill-metadata.json

---

## When to Add Directories

| Add This | When |
|----------|------|
| templates/ | Skill generates SKILL.md files OR common artifacts |
| examples/ | Procedures are abstract; real example helps |
| schemas/ | Complex inputs/outputs need validation |
| tools/ | Skill requires helper scripts or CLI utilities |
| artifacts/ | Skill produces reusable outputs; archive samples |

**Default**: Start with SKILL.md + procedures/. Add others as needed.

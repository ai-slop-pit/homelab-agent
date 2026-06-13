#!/usr/bin/env node
require('dotenv').config({ path: '/opt/claude-agent/.env' })
const { getDatabase } = require('../lib/db')
const { runClaude } = require('../lib/claude-runner')
const fs = require('fs')
const path = require('path')
const AsyncLogger = require('../lib/logger')
const PROJECT_ROOT = '/opt/claude-agent'
const LOGS_DIR = path.join(PROJECT_ROOT, 'logs')
const REFLECTOR_LOG = path.join(LOGS_DIR, 'reflector.log')

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })

const logger = new AsyncLogger(REFLECTOR_LOG)
const db = getDatabase()

function log(msg) {
  logger.log(msg)
}

// ── Analysis: Codebase Structure ──────────────────────────────────────────────

function analyzeCodebase() {
  const analysis = {
    files: [],
    dirs: [],
    dependencies: {},
    structure: {},
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'))
    analysis.dependencies = pkg.dependencies || {}
  } catch(e) {
    log('Could not read package.json: ' + e.message)
  }

  const walk = (dir, depth = 0) => {
    if (depth > 3) return
    const ignore = ['.git', 'node_modules', '.env', 'logs', 'tasks.db', '.config']
    try {
      fs.readdirSync(dir).forEach(f => {
        if (ignore.includes(f)) return
        const p = path.join(dir, f)
        const stat = fs.statSync(p)
        const rel = path.relative(PROJECT_ROOT, p)
        if (stat.isDirectory()) {
          analysis.dirs.push(rel)
          walk(p, depth + 1)
        } else if (['.js', '.json', '.md'].some(ext => f.endsWith(ext))) {
          analysis.files.push(rel)
        }
      })
    } catch(e) {}
  }

  walk(PROJECT_ROOT)
  return analysis
}

// ── Analysis: Recent Activity ────────────────────────────────────────────────

function analyzeRecentActivity() {
  try {
    const done = db.prepare(
      "SELECT type, status, COUNT(*) as count FROM tasks WHERE created_at > datetime('now', '-7 days') GROUP BY type, status"
    ).all()
    const failed = db.prepare(
      "SELECT COUNT(*) as count FROM tasks WHERE status='failed' AND created_at > datetime('now', '-7 days')"
    ).get()
    return { done, failed }
  } catch(e) {
    log('Error analyzing activity: ' + e.message)
    return { done: [], failed: { count: 0 } }
  }
}

// ── Memory Context ───────────────────────────────────────────────────────────

function getMemoryContext() {
  const memoryPath = path.join(PROJECT_ROOT, 'memory')
  const files = []
  try {
    fs.readdirSync(memoryPath).forEach(f => {
      if (f.endsWith('.md')) {
        const content = fs.readFileSync(path.join(memoryPath, f), 'utf8')
        files.push({ name: f, size: content.length })
      }
    })
  } catch(e) {}
  return files
}

// ── Generate Improvement Ideas ───────────────────────────────────────────────

async function generateIdeas() {
  log('Analyzing codebase and generating improvement ideas...')

  const codebase = analyzeCodebase()
  const activity = analyzeRecentActivity()
  const memory = getMemoryContext()

  const prompt = [
    'You are an autonomous agent that learns and improves itself.',
    '',
    'CURRENT STATE:',
    'Project: Claude Home Agent (CT 112)',
    'Files: ' + codebase.files.length + ' | Dirs: ' + codebase.dirs.length,
    'Dependencies: ' + Object.keys(codebase.dependencies).join(', '),
    'Memory files: ' + memory.map(m => m.name).join(', '),
    'Recent activity (7d): ' + JSON.stringify(activity.done),
    'Failed tasks: ' + activity.failed.count,
    '',
    'FILES:',
    codebase.files.slice(0, 20).join('\n'),
    codebase.files.length > 20 ? '... and ' + (codebase.files.length - 20) + ' more' : '',
    '',
    'TASK: Research and generate 3-5 concrete self-improvement ideas.',
    'Focus on:',
    '1. Security: Check npm packages for vulnerabilities, check error handling',
    '2. Performance: Identify bottlenecks, caching opportunities',
    '3. Reliability: Improve error recovery, logging, monitoring',
    '4. Code quality: Simplifications, refactors, missing tests',
    '5. Architecture: Pattern improvements, skill extractions, automation gaps',
    '',
    'For EACH idea:',
    '- Explain what and why',
    '- Estimate significance: "low" (cosmetic), "medium" (improves system), "high" (blocks/risky)',
    '- Give exact steps or files to change',
    '- Suggest task title and description',
    '',
    'Format as JSON array:',
    '[',
    '  {',
    '    "title": "Task title",',
    '    "description": "Full task description with steps",',
    '    "significance": "low|medium|high",',
    '    "category": "security|performance|reliability|quality|architecture",',
    '    "reasoning": "Why this matters"',
    '  }',
    ']',
    '',
    'Only output valid JSON, no other text.'
  ].join('\n')

  try {
    const { result } = await runClaude(prompt, { web: true })
    let ideas = []
    try {
      // Extract JSON from markdown code blocks if wrapped
      let jsonStr = result
      const codeMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeMatch) jsonStr = codeMatch[1]
      ideas = JSON.parse(jsonStr)
      if (!Array.isArray(ideas)) ideas = []
    } catch(e) {
      log('Failed to parse ideas JSON: ' + e.message)
      log('Raw result: ' + result.substring(0, 200))
      return []
    }
    log('Generated ' + ideas.length + ' improvement ideas')
    return ideas
  } catch(e) {
    log('Error generating ideas: ' + e.message)
    return []
  }
}

// ── Create Tasks ─────────────────────────────────────────────────────────────

function createImprovement(idea) {
  try {
    const sig = idea.significance || 'medium'
    const autoExec = (sig === 'low' || sig === 'medium') ? 1 : 0
    const res = db.prepare(
      "INSERT INTO tasks (chat_id, description, type, title, status, created_by, significance, auto_execute, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      'reflector',
      idea.description,
      'improvement',
      idea.title,
      autoExec ? 'approved' : 'backlog',
      'reflector',
      sig,
      autoExec,
      'reflector:' + idea.category
    )
    log('Created ' + sig + ' improvement task #' + res.lastInsertRowid + ': ' + idea.title)
    return res.lastInsertRowid
  } catch(e) {
    log('Error creating task: ' + e.message)
    return null
  }
}

// ── Execute Low-Significance Improvements ────────────────────────────────────

async function autoExecuteLow(taskId) {
  log('Auto-executing low-significance improvement #' + taskId)
  // Placeholder: low-sig improvements will be handled by worker
  // Examples: update comments, fix formatting, consolidate logs
}

// ── Metrics ──────────────────────────────────────────────────────────────────

function recordMetrics(ideas) {
  try {
    const current = db.prepare("SELECT value FROM metrics WHERE key='reflector_cycles'").get()
    const count = (current ? current.value : 0) + 1
    db.prepare("INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run('reflector_cycles', count)

    if (ideas.length) {
      const bySignificance = { low: 0, medium: 0, high: 0 }
      ideas.forEach(i => {
        const sig = i.significance || 'medium'
        bySignificance[sig] = (bySignificance[sig] || 0) + 1
      })
      db.prepare("INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run('reflector_low_ideas', bySignificance.low)
      db.prepare("INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run('reflector_medium_ideas', bySignificance.medium)
      db.prepare("INSERT OR REPLACE INTO metrics (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run('reflector_high_ideas', bySignificance.high)
    }
  } catch(e) {
    log('Failed to record metrics: ' + e.message)
  }
}

// ── Learn from History: Update Memory & Instructions ──────────────────────────

async function updateMemoryAndInstructions() {
  try {
    log('Analyzing task history to update memory and instructions...')

    // Get completed tasks
    const completedTasks = db.prepare(
      "SELECT id, title, description, result FROM tasks WHERE type IN ('work','improvement') AND status='done' AND updated_at > datetime('now', '-7 days') ORDER BY updated_at DESC LIMIT 10"
    ).all()

    if (completedTasks.length === 0) {
      log('No completed tasks to learn from this cycle')
      return
    }

    // Read current memory files
    const memoryPath = path.join(PROJECT_ROOT, 'memory')
    let memoryFiles = []
    try {
      memoryFiles = fs.readdirSync(memoryPath).filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
    } catch(e) {}

    // Read CLAUDE.md
    let claudeMd = ''
    try {
      claudeMd = fs.readFileSync(path.join(PROJECT_ROOT, 'CLAUDE.md'), 'utf8').substring(0, 2000)
    } catch(e) {}

    // Generate suggestions for memory/instruction updates
    const prompt = [
      'You are analyzing completed tasks to improve agent instructions and memory.',
      '',
      'COMPLETED TASKS (last 7 days):',
      completedTasks.map(t => `#${t.id}: ${t.title || t.description.substring(0, 60)}`).join('\n'),
      '',
      'CURRENT MEMORY FILES:',
      memoryFiles.length ? memoryFiles.join(', ') : '(none)',
      '',
      'CURRENT INSTRUCTIONS (CLAUDE.md excerpt):',
      claudeMd.substring(0, 500),
      '',
      'TASK: Analyze what you learned and suggest improvements to:',
      '1. Memory files - new learnings or patterns to document',
      '2. Agent instructions (CLAUDE.md) - rules or procedures to add/update',
      '3. Skills - new reusable procedures to extract',
      '',
      'Format as JSON:',
      '{',
      '  "memory_updates": [{"file": "name.md", "content": "..."}],',
      '  "instructions_updates": "updated sections for CLAUDE.md",',
      '  "skills_to_extract": ["skill1", "skill2"],',
      '  "reasoning": "why these updates matter"',
      '}',
      '',
      'Only output valid JSON.'
    ].join('\n')

    const { result } = await runClaude(prompt)
    try {
      let jsonStr = result
      const codeMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeMatch) jsonStr = codeMatch[1]
      const updates = JSON.parse(jsonStr)

      if (updates.memory_updates && updates.memory_updates.length > 0) {
        for (const mu of updates.memory_updates) {
          const filePath = path.join(memoryPath, mu.file)
          fs.writeFileSync(filePath, mu.content, 'utf8')
          log('Updated memory file: ' + mu.file)
        }
      }

      if (updates.reasoning) {
        log('Learning: ' + updates.reasoning.substring(0, 100))
      }
    } catch(e) {
      log('Could not parse instruction updates: ' + e.message)
    }
  } catch(e) {
    log('Error updating memory/instructions: ' + e.message)
  }
}

// ── Main Loop ────────────────────────────────────────────────────────────────

async function reflect() {
  try {
    // First, learn from history and update memory/instructions
    await updateMemoryAndInstructions()

    // Then generate new improvement ideas
    const ideas = await generateIdeas()
    recordMetrics(ideas)

    if (!ideas.length) {
      log('No improvement ideas generated this cycle')
      return
    }

    let ideasBySignificance = { low: 0, medium: 0, high: 0 }
    for (const idea of ideas) {
      const taskId = createImprovement(idea)
      if (taskId && idea.significance === 'low') {
        await autoExecuteLow(taskId)
      }
      ideasBySignificance[idea.significance] = (ideasBySignificance[idea.significance] || 0) + 1
    }

    log('Reflection cycle complete: ' + ideas.length + ' ideas (low: ' + ideasBySignificance.low + ', medium: ' + ideasBySignificance.medium + ', high: ' + ideasBySignificance.high + ')')
  } catch(e) {
    log('Fatal error in reflection: ' + e.message)
  }
}

// ── Entry Point ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const cmd = args[0]

if (cmd === 'once') {
  log('Running reflection cycle (once)...')
  reflect().then(() => process.exit(0)).catch(e => {
    log('Reflection failed: ' + e.message)
    process.exit(1)
  })
} else if (cmd === 'daemon') {
  const INTERVAL = parseInt(args[1]) || 3600000 // default 1 hour
  log('Starting reflector daemon (interval: ' + INTERVAL + 'ms)')
  reflect()
  setInterval(reflect, INTERVAL)
} else {
  console.log('Usage: reflector.js once | daemon [interval_ms]')
  process.exit(1)
}

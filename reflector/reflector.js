#!/usr/bin/env node
require('dotenv').config({ path: '/opt/claude-agent/.env' })
const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const DB_PATH = '/opt/claude-agent/tasks.db'
const PROJECT_ROOT = '/opt/claude-agent'
const LOGS_DIR = path.join(PROJECT_ROOT, 'logs')
const REFLECTOR_LOG = path.join(LOGS_DIR, 'reflector.log')

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })

const db = new Database(DB_PATH)

// Apply migrations
const MIGRATIONS = [
  "ALTER TABLE tasks ADD COLUMN session_id TEXT",
  "ALTER TABLE tasks ADD COLUMN tg_message_id TEXT",
  "ALTER TABLE tasks ADD COLUMN thinking_msg_id TEXT",
  "ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT 'chat'",
  "ALTER TABLE tasks ADD COLUMN title TEXT",
  "ALTER TABLE tasks ADD COLUMN plan TEXT",
  "ALTER TABLE tasks ADD COLUMN progress TEXT",
  "ALTER TABLE tasks ADD COLUMN created_by TEXT DEFAULT 'user'",
  "ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 0",
  "ALTER TABLE tasks ADD COLUMN rejection_notes TEXT",
  "ALTER TABLE tasks ADD COLUMN tg_topic_id INTEGER",
  "ALTER TABLE tasks ADD COLUMN significance TEXT DEFAULT 'medium'",
  "ALTER TABLE tasks ADD COLUMN auto_execute INTEGER DEFAULT 0",
  "ALTER TABLE tasks ADD COLUMN source TEXT",
]
for (const m of MIGRATIONS) { try { db.exec(m) } catch(e) {} }

function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg
  console.log(line)
  fs.appendFileSync(REFLECTOR_LOG, line + '\n')
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

// ── Claude: Research & Generate Ideas ────────────────────────────────────────

function runClaude(prompt, opts) {
  opts = opts || {}
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'json']
    if (opts.dangerousSkip) args.push('--dangerously-skip-permissions')
    if (opts.web) {
      args.push('--append-system-prompt',
        'You have access to web search. Use it to research current best practices, security advisories, and trends.')
    }

    const env = Object.assign({}, process.env, { HOME: '/root' })
    const claude = spawn('claude', args, { cwd: PROJECT_ROOT, timeout: 600000, env })

    let out = '', err = ''
    claude.stdout.on('data', d => out += d)
    claude.stderr.on('data', d => err += d)
    claude.on('close', code => {
      if (code !== 0) return reject(new Error('Claude exit ' + code + ': ' + err.substring(0, 200)))
      let result = ''
      for (const line of out.trim().split('\n')) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line)
          if (obj.type === 'result') result = obj.result || ''
        } catch(e) {}
      }
      if (!result) result = out.trim()
      resolve(result)
    })
    claude.on('error', reject)
  })
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
    const result = await runClaude(prompt, { web: true })
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
    const autoExec = sig === 'low' ? 1 : 0
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

// ── Main Loop ────────────────────────────────────────────────────────────────

async function reflect() {
  try {
    const ideas = await generateIdeas()
    if (!ideas.length) {
      log('No improvement ideas generated this cycle')
      return
    }

    for (const idea of ideas) {
      const taskId = createImprovement(idea)
      if (taskId && idea.significance === 'low') {
        await autoExecuteLow(taskId)
      }
    }

    log('Reflection cycle complete: ' + ideas.length + ' ideas generated')
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

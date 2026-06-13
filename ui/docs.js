const fs = require('fs')
const path = require('path')

const BASE_DIR = '/opt/claude-agent'

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (e) {
    return null
  }
}

function getDependencies() {
  const pkg = readFile(path.join(BASE_DIR, 'package.json'))
  if (!pkg) return {}
  try {
    const parsed = JSON.parse(pkg)
    return parsed.dependencies || {}
  } catch (e) {
    return {}
  }
}

function getArchitecture() {
  const claude = readFile(path.join(BASE_DIR, 'CLAUDE.md'))
  const soul = readFile(path.join(BASE_DIR, 'SOUL.md'))

  return {
    claude: claude || 'No CLAUDE.md found',
    soul: soul || 'No SOUL.md found'
  }
}

function getServices() {
  const memory = readFile(path.join(BASE_DIR, 'memory/infrastructure_services.md'))

  if (!memory) {
    return {
      description: 'No infrastructure services documented yet',
      services: []
    }
  }

  // Parse markdown to extract service info
  const services = []
  const lines = memory.split('\n')
  let currentService = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      if (currentService) services.push(currentService)
      currentService = {
        name: line.replace('## ', '').trim(),
        details: []
      }
    } else if (currentService && line.startsWith('- **')) {
      const match = line.match(/- \*\*([^*]+)\*\*:\s*(.+)/)
      if (match) {
        currentService.details.push({
          key: match[1],
          value: match[2]
        })
      }
    }
  }

  if (currentService) services.push(currentService)

  return {
    description: 'Infrastructure services running on Proxmox cluster',
    services
  }
}

function getSetup() {
  // Read package.json to show install instructions
  const pkg = readFile(path.join(BASE_DIR, 'package.json'))
  let setupGuide = `# Setup Instructions

## Quick Start

1. **Install Node.js dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Configure Environment**
   - Create \`.env\` file in project root
   - Add required configuration variables

3. **Initialize Database**
   - Database is auto-initialized on first run
   - Schema: \`db/schema.sql\`

4. **Start Services**
   \`\`\`bash
   npm run dev
   \`\`\`

## Project Structure

- \`ui/\` — Web dashboard and server
- \`db/\` — Database schema and queries
- \`skills/\` — Reusable procedures
- \`memory/\` — Persistent learnings and facts
- \`.env\` — Environment configuration (secrets)

## Dependencies

\`\`\`json
${pkg ? JSON.stringify(JSON.parse(pkg).dependencies || {}, null, 2) : '{}'}
\`\`\`
`

  return setupGuide
}

function getSystemInfo() {
  const pkg = readFile(path.join(BASE_DIR, 'package.json'))
  let pkgVersion = 'unknown'
  try {
    const parsed = JSON.parse(pkg)
    pkgVersion = parsed.version || 'unknown'
  } catch (e) {}

  return {
    agentName: 'CT 112',
    agentRole: 'Personal autonomous homelab assistant',
    nodeVersion: process.version,
    projectVersion: pkgVersion,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime()
  }
}

function generateDocs() {
  const deps = getDependencies()
  const arch = getArchitecture()
  const services = getServices()
  const setup = getSetup()
  const systemInfo = getSystemInfo()

  return {
    system: systemInfo,
    dependencies: deps,
    architecture: arch,
    services: services,
    setup: setup,
    timestamp: new Date().toISOString()
  }
}

// Cache with 60s TTL
let docCache = null
let docCacheTime = 0
const CACHE_TTL = 60000

function getDocsCached() {
  const now = Date.now()
  if (docCache && (now - docCacheTime) < CACHE_TTL) {
    return docCache
  }

  docCache = generateDocs()
  docCacheTime = now
  return docCache
}

module.exports = { generateDocs, getDocsCached }

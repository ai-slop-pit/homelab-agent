const { spawn } = require('child_process')

/**
 * Run Claude with a prompt and optional parameters.
 * @param {string} prompt - The prompt to send to Claude
 * @param {object} opts - Options object with optional properties:
 *   - addDir: directory to add context from
 *   - dangerousSkip: if true, skip permission prompts
 *   - web: if true, add system prompt enabling web search
 *   - sysPrompt: custom system prompt to append
 *   - resume: session ID to resume
 *   - env: environment variables to merge with process.env
 *   - cwd: working directory (default: /opt/claude-agent)
 * @returns {Promise<{result: string, sessionId: string|null}>}
 */
async function runClaude(prompt, opts = {}) {
  return new Promise((resolve, reject) => {
    const args = ['-p', prompt, '--output-format', 'json']

    if (opts.dangerousSkip) args.push('--dangerously-skip-permissions')
    if (opts.addDir) args.push('--add-dir', opts.addDir)
    if (opts.resume) args.push('--resume', opts.resume)

    // Handle system prompt: either web mode or custom
    if (opts.web) {
      args.push('--append-system-prompt',
        'You have access to web search. Use it to research current best practices, security advisories, and trends.')
    } else if (opts.sysPrompt) {
      args.push('--append-system-prompt', opts.sysPrompt)
    }

    const env = Object.assign({}, process.env, { HOME: '/root' }, opts.env || {})
    const cwd = opts.cwd || '/opt/claude-agent'
    const claude = spawn('claude', args, { cwd, timeout: 600000, env })

    let out = '', err = ''
    claude.stdout.on('data', d => out += d)
    claude.stderr.on('data', d => err += d)

    claude.on('close', code => {
      if (code !== 0) return reject(new Error('Claude exit ' + code + ': ' + err.substring(0, 200)))

      let result = '', sessionId = null
      for (const line of out.trim().split('\n')) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line)
          if (obj.session_id) sessionId = obj.session_id
          if (obj.type === 'result') result = obj.result || ''
        } catch(e) {}
      }
      if (!result) result = out.trim()

      resolve({ result, sessionId })
    })

    claude.on('error', reject)
  })
}

module.exports = { runClaude }

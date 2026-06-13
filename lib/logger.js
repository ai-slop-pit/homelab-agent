const fs = require('fs')
const path = require('path')

class AsyncLogger {
  constructor(logPath, flushInterval = 100, bufferSize = 4096) {
    this.logPath = logPath
    this.flushInterval = flushInterval
    this.bufferSize = bufferSize
    this.buffer = ''
    this.flushing = false
    this.timer = null
    this.closed = false

    // Ensure log directory exists
    const dir = path.dirname(logPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Set up exit handler to flush remaining logs
    process.on('exit', () => {
      this.flushSync()
    })
  }

  log(msg) {
    if (this.closed) return

    const line = '[' + new Date().toISOString() + '] ' + msg + '\n'
    this.buffer += line
    console.log(line.trim())

    // Flush if buffer exceeds size threshold
    if (this.buffer.length >= this.bufferSize) {
      this.flush()
    } else if (!this.timer) {
      // Schedule flush if not already scheduled
      this.timer = setTimeout(() => this.flush(), this.flushInterval)
    }
  }

  flush() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    if (this.buffer.length === 0 || this.flushing) return

    this.flushing = true
    const data = this.buffer
    this.buffer = ''

    fs.promises
      .appendFile(this.logPath, data, 'utf8')
      .catch((err) => {
        console.error('Logger error:', err)
      })
      .finally(() => {
        this.flushing = false
      })
  }

  flushSync() {
    if (this.buffer.length === 0) return

    try {
      fs.appendFileSync(this.logPath, this.buffer, 'utf8')
      this.buffer = ''
    } catch (err) {
      console.error('Logger sync flush error:', err)
    }
  }

  close() {
    this.closed = true
    this.flushSync()
  }
}

module.exports = AsyncLogger

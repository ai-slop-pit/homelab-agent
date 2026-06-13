const MAX_MSGS_PER_SEC = 20
const REFILL_RATE = MAX_MSGS_PER_SEC / 1000 // tokens per ms
const MAX_BURST = Math.ceil(MAX_MSGS_PER_SEC * 1.5) // allow 1.5x burst

class TokenBucket {
  constructor(maxRate = MAX_MSGS_PER_SEC, burstSize = MAX_BURST) {
    this.maxRate = maxRate
    this.burstSize = burstSize
    this.tokens = burstSize
    this.lastRefillTime = Date.now()
    this.lastUsedTime = Date.now()
    this.perChatLimiters = {}
  }

  refill() {
    const now = Date.now()
    const timePassed = now - this.lastRefillTime
    const tokensToAdd = timePassed * REFILL_RATE
    this.tokens = Math.min(this.burstSize, this.tokens + tokensToAdd)
    this.lastRefillTime = now
  }

  tryConsume(cost = 1) {
    this.refill()
    if (this.tokens >= cost) {
      this.tokens -= cost
      return true
    }
    return false
  }

  getWaitTime(cost = 1) {
    this.refill()
    if (this.tokens >= cost) return 0
    const deficit = cost - this.tokens
    return Math.ceil(deficit / REFILL_RATE)
  }

  getPerChatLimiter(chatId) {
    if (!this.perChatLimiters[chatId]) {
      this.perChatLimiters[chatId] = new TokenBucket(5, 8) // per-chat: 5 msgs/sec, burst 8
    }
    this.perChatLimiters[chatId].lastUsedTime = Date.now()
    return this.perChatLimiters[chatId]
  }
}

class RateLimiter {
  constructor() {
    this.globalBucket = new TokenBucket(MAX_MSGS_PER_SEC, MAX_BURST)
    this.queue = []
    this.isProcessing = false
    this.backoffUntil = 0
    this.lastLog = 0
    this.logIntervalMs = 5000 // log at most every 5s
  }

  async enqueue(fn, chatId = null) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, chatId, resolve, reject, timestamp: Date.now() })
      this.process().catch(reject)
    })
  }

  async process() {
    if (this.isProcessing || this.queue.length === 0) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const now = Date.now()

      // Check if in backoff (from 429 error)
      if (now < this.backoffUntil) {
        await this.sleep(Math.min(100, this.backoffUntil - now))
        continue
      }

      const item = this.queue[0]
      const perChatLimiter = item.chatId ? this.globalBucket.getPerChatLimiter(item.chatId) : null

      // Check both global and per-chat limits
      const globalWait = this.globalBucket.getWaitTime(1)
      const perChatWait = perChatLimiter ? perChatLimiter.getWaitTime(1) : 0
      const maxWait = Math.max(globalWait, perChatWait)

      if (maxWait > 0) {
        await this.sleep(maxWait)
        continue
      }

      // Consume tokens
      this.globalBucket.tryConsume(1)
      if (perChatLimiter) perChatLimiter.tryConsume(1)

      // Execute the request
      this.queue.shift()
      try {
        const result = await item.fn()

        // Check for 429 (rate limited) in response
        if (result && result.error_code === 429) {
          const retryAfter = result.parameters?.retry_after || 2
          this.backoffUntil = now + (retryAfter * 1000)
          this.logThrottled(`TG rate limit (429), backing off for ${retryAfter}s`)
          this.queue.unshift(item) // Re-queue the request
          await this.sleep(retryAfter * 1000)
        } else {
          item.resolve(result)
        }
      } catch (err) {
        this.logThrottled(`Rate limiter error: ${err.message}`)
        item.reject(err)
      }
    }

    this.isProcessing = false
  }

  sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
  }

  logThrottled(msg) {
    const now = Date.now()
    if (now - this.lastLog > this.logIntervalMs) {
      console.log('[' + new Date().toISOString() + '] [RATE_LIMIT] ' + msg)
      this.lastLog = now
    }
  }

  cleanupOldLimiters() {
    const cutoff = Date.now() - 86400000 // 24 hours
    const before = Object.keys(this.globalBucket.perChatLimiters).length
    Object.keys(this.globalBucket.perChatLimiters).forEach(id => {
      if (this.globalBucket.perChatLimiters[id].lastUsedTime < cutoff) {
        delete this.globalBucket.perChatLimiters[id]
      }
    })
    const after = Object.keys(this.globalBucket.perChatLimiters).length
    if (before > after) {
      this.logThrottled(`Cleanup: removed ${before - after} unused chat limiters`)
    }
  }
}

module.exports = {
  RateLimiter,
  TokenBucket,
  MAX_MSGS_PER_SEC,
  MAX_BURST
}

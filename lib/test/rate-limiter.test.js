const { TokenBucket, RateLimiter, MAX_MSGS_PER_SEC, MAX_BURST } = require('../rateLimit')

describe('TokenBucket - Basic Operations', () => {
  it('should initialize with correct burst size', () => {
    const bucket = new TokenBucket()
    expect(bucket.tokens).toBe(MAX_BURST)
    expect(bucket.burstSize).toBe(MAX_BURST)
  })

  it('should initialize with custom parameters', () => {
    const bucket = new TokenBucket(10, 15)
    expect(bucket.maxRate).toBe(10)
    expect(bucket.burstSize).toBe(15)
    expect(bucket.tokens).toBe(15)
  })

  it('should consume a token when available', () => {
    const bucket = new TokenBucket(10, 15)
    const result = bucket.tryConsume(1)
    expect(result).toBe(true)
    expect(bucket.tokens).toBe(14)
  })

  it('should reject consumption when tokens unavailable', () => {
    const bucket = new TokenBucket(10, 2)
    bucket.tryConsume(2) // Consume all tokens
    const result = bucket.tryConsume(1)
    expect(result).toBe(false)
    expect(bucket.tokens).toBe(0)
  })

  it('should refill tokens over time', () => {
    const bucket = new TokenBucket(10, 15)
    bucket.tokens = 5 // Manually reduce tokens
    bucket.lastRefillTime = Date.now() - 1000 // Simulate 1 second passed

    bucket.refill()
    expect(bucket.tokens).toBeGreaterThan(5)
    expect(bucket.tokens).toBeLessThanOrEqual(15)
  })

  it('should not exceed burst size when refilling', () => {
    const bucket = new TokenBucket(10, 15)
    bucket.lastRefillTime = Date.now() - 10000 // 10 seconds passed

    bucket.refill()
    expect(bucket.tokens).toBe(15) // Capped at burst size
  })
})

describe('TokenBucket - Wait Time Calculation', () => {
  it('should return 0 wait time when tokens available', () => {
    const bucket = new TokenBucket(10, 15)
    const wait = bucket.getWaitTime(1)
    expect(wait).toBe(0)
  })

  it('should calculate wait time when tokens unavailable', () => {
    const bucket = new TokenBucket(10, 15)
    bucket.tokens = 0

    const wait = bucket.getWaitTime(1)
    expect(wait).toBeGreaterThan(0)
  })

  it('should calculate wait time for multiple tokens', () => {
    const bucket = new TokenBucket(10, 15)
    bucket.tokens = 0

    const wait1 = bucket.getWaitTime(1)
    const wait5 = bucket.getWaitTime(5)
    expect(wait5).toBeGreaterThan(wait1)
  })
})

describe('TokenBucket - Per-Chat Limiters', () => {
  it('should create a new limiter for new chat', () => {
    const bucket = new TokenBucket()
    const limiter = bucket.getPerChatLimiter('chat123')

    expect(limiter).toBeDefined()
    expect(limiter.maxRate).toBe(5) // 5 msgs/sec per chat
    expect(limiter.burstSize).toBe(8)
  })

  it('should return same limiter for same chat', () => {
    const bucket = new TokenBucket()
    const limiter1 = bucket.getPerChatLimiter('chat123')
    const limiter2 = bucket.getPerChatLimiter('chat123')

    expect(limiter1).toBe(limiter2)
  })

  it('should create separate limiters for different chats', () => {
    const bucket = new TokenBucket()
    const limiter1 = bucket.getPerChatLimiter('chat123')
    const limiter2 = bucket.getPerChatLimiter('chat456')

    expect(limiter1).not.toBe(limiter2)
  })

  it('should update lastUsedTime on access', () => {
    const bucket = new TokenBucket()
    const before = Date.now()
    bucket.getPerChatLimiter('chat123')
    const after = Date.now()

    expect(bucket.perChatLimiters['chat123'].lastUsedTime).toBeGreaterThanOrEqual(before)
    expect(bucket.perChatLimiters['chat123'].lastUsedTime).toBeLessThanOrEqual(after)
  })

  it('should enforce per-chat rate limits independently', () => {
    const bucket = new TokenBucket()
    const limiter1 = bucket.getPerChatLimiter('chat1')
    const limiter2 = bucket.getPerChatLimiter('chat2')

    limiter1.tokens = 0
    const wait1 = limiter1.getWaitTime(1)

    const wait2 = limiter2.getWaitTime(1)

    expect(wait1).toBeGreaterThan(0)
    expect(wait2).toBe(0) // limiter2 still has tokens
  })
})

describe('RateLimiter - Queue Management', () => {
  it('should queue functions for rate-limited execution', async () => {
    const limiter = new RateLimiter()
    let executed = false

    const fn = jest.fn(() => {
      executed = true
      return Promise.resolve('ok')
    })

    await limiter.enqueue(fn)
    expect(executed).toBe(true)
    expect(fn).toHaveBeenCalled()
  })

  it('should execute queued functions in order', async () => {
    const limiter = new RateLimiter()
    const execOrder = []

    const fn1 = jest.fn(() => {
      execOrder.push(1)
      return Promise.resolve()
    })

    const fn2 = jest.fn(() => {
      execOrder.push(2)
      return Promise.resolve()
    })

    await Promise.all([
      limiter.enqueue(fn1),
      limiter.enqueue(fn2)
    ])

    expect(execOrder).toEqual([1, 2])
  })

  it('should handle function errors', async () => {
    const limiter = new RateLimiter()

    const fn = jest.fn(() => {
      return Promise.reject(new Error('Test error'))
    })

    await expect(limiter.enqueue(fn)).rejects.toThrow('Test error')
  })

  it('should reject on throw synchronously', async () => {
    const limiter = new RateLimiter()

    const fn = jest.fn(() => {
      throw new Error('Sync error')
    })

    await expect(limiter.enqueue(fn)).rejects.toThrow('Sync error')
  })
})

describe('RateLimiter - Global and Per-Chat Limits', () => {
  it('should respect global rate limit', async () => {
    jest.useFakeTimers()
    const limiter = new RateLimiter()

    // Consume all global tokens quickly
    limiter.globalBucket.tokens = 1
    const calls = []

    const fn = jest.fn(() => {
      calls.push(Date.now())
      return Promise.resolve()
    })

    // Queue two calls
    const p1 = limiter.enqueue(fn)
    const p2 = limiter.enqueue(fn)

    // Process immediately - first should go through, second should wait
    await jest.runAllTimersAsync()
    await Promise.all([p1, p2])

    expect(calls.length).toBe(2)
    // Second call should have higher timestamp (after wait)
    expect(calls[1]).toBeGreaterThanOrEqual(calls[0])

    jest.useRealTimers()
  })

  it('should enforce per-chat rate limits', async () => {
    jest.useFakeTimers()
    const limiter = new RateLimiter()

    const calls = []

    const fn = jest.fn(() => {
      calls.push(Date.now())
      return Promise.resolve()
    })

    // Queue multiple calls for same chat
    const promises = [
      limiter.enqueue(fn, 'chat123'),
      limiter.enqueue(fn, 'chat123'),
      limiter.enqueue(fn, 'chat123')
    ]

    await jest.runAllTimersAsync()
    await Promise.all(promises)

    expect(calls.length).toBe(3)
    // Calls should be spaced out due to per-chat limit
  })

  it('should allow different chats to have independent limits', async () => {
    jest.useFakeTimers()
    const limiter = new RateLimiter()

    const fn = jest.fn(() => Promise.resolve())

    // Queue calls for different chats
    const promises = [
      limiter.enqueue(fn, 'chat1'),
      limiter.enqueue(fn, 'chat2'),
      limiter.enqueue(fn, 'chat3')
    ]

    await jest.runAllTimersAsync()
    await Promise.all(promises)

    expect(fn).toHaveBeenCalledTimes(3)
    jest.useRealTimers()
  })
})

describe('RateLimiter - Backoff Strategy', () => {
  it('should implement backoff for 429 responses', async () => {
    const limiter = new RateLimiter()

    const fn = jest.fn(() => {
      return Promise.resolve({
        error_code: 429,
        parameters: { retry_after: 1 }
      })
    })

    limiter.enqueue(fn).catch(() => {})

    // Advance time enough for retry
    await new Promise(r => setTimeout(r, 100))

    // backoffUntil should be set
    expect(limiter.backoffUntil).toBeGreaterThan(Date.now())
  })

  it('should not call function during backoff', async () => {
    jest.useFakeTimers()
    const limiter = new RateLimiter()

    const fn = jest.fn(() => Promise.resolve())

    // Set backoff until future
    limiter.backoffUntil = Date.now() + 5000

    limiter.enqueue(fn).catch(() => {})

    // Run timers but should still be in backoff
    await jest.runTimersToTimeAsync(2000)

    expect(fn).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('should resume processing after backoff expires', async () => {
    jest.useFakeTimers()
    const limiter = new RateLimiter()

    const fn = jest.fn(() => Promise.resolve('ok'))

    // Set backoff until near future
    limiter.backoffUntil = Date.now() + 500

    const promise = limiter.enqueue(fn)

    // Run past backoff time
    await jest.runTimersToTimeAsync(600)
    const result = await promise

    expect(result).toBe('ok')
    jest.useRealTimers()
  })
})

describe('RateLimiter - Cleanup', () => {
  it('should remove old unused chat limiters', () => {
    const limiter = new RateLimiter()

    // Create some chat limiters
    limiter.globalBucket.getPerChatLimiter('old_chat')
    limiter.globalBucket.getPerChatLimiter('recent_chat')

    // Manually set old time for old_chat
    limiter.globalBucket.perChatLimiters['old_chat'].lastUsedTime = Date.now() - 86400000 * 2 // 2 days ago

    const beforeCount = Object.keys(limiter.globalBucket.perChatLimiters).length
    limiter.cleanupOldLimiters()
    const afterCount = Object.keys(limiter.globalBucket.perChatLimiters).length

    expect(afterCount).toBeLessThan(beforeCount)
    expect(limiter.globalBucket.perChatLimiters['old_chat']).toBeUndefined()
    expect(limiter.globalBucket.perChatLimiters['recent_chat']).toBeDefined()
  })

  it('should not remove recently used chat limiters', () => {
    const limiter = new RateLimiter()

    limiter.globalBucket.getPerChatLimiter('chat123')
    const beforeCount = Object.keys(limiter.globalBucket.perChatLimiters).length

    limiter.cleanupOldLimiters()
    const afterCount = Object.keys(limiter.globalBucket.perChatLimiters).length

    expect(afterCount).toBe(beforeCount)
    expect(limiter.globalBucket.perChatLimiters['chat123']).toBeDefined()
  })
})

describe('RateLimiter - Throttled Logging', () => {
  it('should log at most once per interval', async () => {
    jest.useFakeTimers()
    const limiter = new RateLimiter()

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

    limiter.logThrottled('message 1')
    limiter.logThrottled('message 2')
    limiter.logThrottled('message 3')

    // Should only log once (throttled)
    expect(consoleSpy).toHaveBeenCalledTimes(1)

    // Advance past throttle interval
    jest.advanceTimersByTime(5001)

    limiter.logThrottled('message 4')

    // Now should log again
    expect(consoleSpy).toHaveBeenCalledTimes(2)

    consoleSpy.mockRestore()
    jest.useRealTimers()
  })
})

const { RateLimiter } = require('./lib/rateLimit')

async function testRateLimiter() {
  console.log('Testing RateLimiter with burst of 50 messages...\n')

  const limiter = new RateLimiter()
  const results = []
  const startTime = Date.now()
  let completedCount = 0

  // Simulate 50 rapid message requests
  for (let i = 0; i < 50; i++) {
    limiter.enqueue(async () => {
      const elapsed = Date.now() - startTime
      results.push({ id: i, time: elapsed })
      completedCount++
      if (completedCount % 10 === 0) {
        console.log(`  Progress: ${completedCount}/50 messages processed (${elapsed}ms)`)
      }
      return { ok: true, id: i }
    }, `chat_${i % 3}`) // Distribute across 3 different chats
  }

  // Wait for all to complete
  await new Promise(r => setTimeout(r, 3000))

  console.log('\nResults:')
  console.log(`  Total messages: ${results.length}`)
  console.log(`  Time elapsed: ${results[results.length - 1]?.time || 0}ms`)

  // Analyze throughput
  const timeSpan = results[results.length - 1]?.time || 0
  const avgMsPerMsg = timeSpan / results.length
  const msgsPerSecond = (results.length / timeSpan) * 1000

  console.log(`  Avg ms per message: ${avgMsPerMsg.toFixed(2)}`)
  console.log(`  Throughput: ${msgsPerSecond.toFixed(2)} msgs/sec`)
  console.log(`  Expected: ~20 msgs/sec, got: ${msgsPerSecond.toFixed(2)} (good if lower due to processing overhead)`)

  // Show that messages are spread over time (rate limited)
  const msgsPerSecondBucket = {}
  for (let i = 0; i < 3000; i += 100) {
    const count = results.filter(r => r.time >= i && r.time < i + 100).length
    if (count > 0) msgsPerSecondBucket[`${i}-${i+100}ms`] = count
  }

  console.log('\nDistribution (messages per 100ms):')
  Object.entries(msgsPerSecondBucket).slice(0, 10).forEach(([time, count]) => {
    console.log(`  ${time}: ${count} messages`)
  })

  console.log('\n✅ Rate limiter test complete')
}

testRateLimiter().catch(console.error)

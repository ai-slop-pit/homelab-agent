require('dotenv').config()
const https = require('https')

const BOT_TOKEN = process.env.BOT_TOKEN
const GROUP_ID = process.env.GROUP_ID

function tgPost(path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)
    const req = https.request({
      hostname: 'api.telegram.org',
      path: '/bot' + BOT_TOKEN + path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve(parsed)
        } catch(e) {
          resolve(null)
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function closeAllTopics() {
  console.log('Closing ALL topics in group', GROUP_ID)
  
  let closed = 0
  let failed = 0
  
  // Try much wider range - 1 to 1000
  for (let topicId = 1; topicId <= 1000; topicId++) {
    try {
      const result = await tgPost('/closeForumTopic', {
        chat_id: GROUP_ID,
        message_thread_id: topicId
      })
      if (result && result.ok) {
        console.log(`✓ Closed topic ${topicId}`)
        closed++
      } else {
        failed++
      }
    } catch(e) {
      failed++
    }
  }
  console.log(`\n✓ Closed ${closed} topics total`)
  console.log(`✗ Failed/not found: ${failed}`)
}

closeAllTopics().catch(e => console.error('Error:', e.message))

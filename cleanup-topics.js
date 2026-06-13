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

async function closeTopics() {
  console.log('Attempting to close orphaned topics in group', GROUP_ID)
  
  // Try to close topics - iterate through a range of possible topic IDs
  let closed = 0
  for (let topicId = 1; topicId <= 100; topicId++) {
    try {
      const result = await tgPost('/closeForumTopic', {
        chat_id: GROUP_ID,
        message_thread_id: topicId
      })
      if (result && result.ok) {
        console.log(`✓ Closed topic ${topicId}`)
        closed++
      }
    } catch(e) {
      // Ignore errors, topic might not exist
    }
  }
  console.log(`Closed ${closed} topics`)
}

closeTopics().catch(e => console.error('Error:', e.message))

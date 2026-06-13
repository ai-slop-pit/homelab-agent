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

async function deleteAllTopics() {
  console.log('Deleting ALL topics in group', GROUP_ID)
  
  let deleted = 0
  
  // Try range 1-500
  for (let topicId = 1; topicId <= 500; topicId++) {
    try {
      const result = await tgPost('/deleteForumTopic', {
        chat_id: GROUP_ID,
        message_thread_id: topicId
      })
      if (result && result.ok) {
        console.log(`✓ Deleted topic ${topicId}`)
        deleted++
      }
    } catch(e) {}
  }
  console.log(`\n✓ Deleted ${deleted} topics total`)
}

deleteAllTopics().catch(e => console.error('Error:', e.message))

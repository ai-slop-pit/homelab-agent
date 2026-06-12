require('dotenv').config({ path: '/opt/claude-agent/.env' })
const http = require('http')
const Database = require('better-sqlite3')

const db = new Database('/opt/claude-agent/tasks.db')
const PORT = 3000

const STATUS_META = {
  backlog:           { label: 'Backlog',          color: '#64748b' },
  planning:          { label: 'Planning',          color: '#60a5fa' },
  awaiting_approval: { label: 'Awaiting Approval', color: '#fb923c' },
  needs_revision:    { label: 'Needs Revision',    color: '#f59e0b' },
  approved:          { label: 'Approved',          color: '#4ade80' },
  in_progress:       { label: 'In Progress',       color: '#38bdf8' },
  blocked:           { label: 'Blocked',           color: '#f87171' },
  done:              { label: 'Done',              color: '#34d399' },
  failed:            { label: 'Failed',            color: '#ef4444' },
}

const BOARD_COLS = ['backlog','awaiting_approval','in_progress','blocked','done']

// ── API helpers ───────────────────────────────────────────────────────────────

function getTasks() {
  return db.prepare("SELECT * FROM tasks WHERE type='work' OR type='improvement' ORDER BY updated_at DESC LIMIT 300").all()
}

function getChatDone() {
  return db.prepare("SELECT * FROM tasks WHERE (type='chat' OR type IS NULL) ORDER BY updated_at DESC LIMIT 8").all()
}

// ── HTML shell (served once, client renders from JSON) ────────────────────────

const SHELL = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CT112 Agent</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh}

/* Header */
header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:14px 20px;border-bottom:1px solid #1e2433;background:#0d1018;position:sticky;top:0;z-index:10}
header h1{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px;white-space:nowrap}
header h1 span{color:#64748b;font-weight:400}
.pulse{width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 2s infinite;flex-shrink:0}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.stats{display:flex;gap:16px;font-size:12px;color:#64748b;flex-wrap:wrap}
.stats b{color:#e2e8f0}
.last-update{font-size:11px;color:#334155}

/* Board — horizontal scroll on desktop, vertical stack on mobile */
.board{display:flex;gap:14px;padding:20px;overflow-x:auto;align-items:flex-start;-webkit-overflow-scrolling:touch}
@media(max-width:600px){
  .board{flex-direction:column;overflow-x:visible}
  .column{min-width:unset!important;width:100%}
}
.column{min-width:260px;flex-shrink:0}
.col-header{display:flex;align-items:center;justify-content:space-between;padding:4px 2px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
.col-count{font-size:12px;font-weight:700}
.cards{display:flex;flex-direction:column;gap:8px}

/* Cards */
.card{background:#141922;border:1px solid #1e2433;border-radius:10px;padding:12px;transition:border-color .15s}
.card:hover{border-color:#2d3748}
.card-hl{border-color:#fb923c!important}
.card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px}
.card-title{font-size:13px;font-weight:500;line-height:1.4;color:#e2e8f0}
.badge{font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;white-space:nowrap;flex-shrink:0}
.badge-user{background:#1e3a5f;color:#60a5fa}
.badge-agent{background:#1a2e1a;color:#4ade80}
.card-meta{display:flex;align-items:center;gap:6px;font-size:11px;color:#475569;margin-bottom:8px;flex-wrap:wrap}
.chip{font-size:10px;font-weight:600;padding:2px 7px;border-radius:10px;text-transform:uppercase;letter-spacing:.05em}
.age{color:#475569}
.progress-line{font-size:11px;color:#64748b;background:#0f1117;border-radius:6px;padding:5px 8px;margin-bottom:6px;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.plan-box{font-size:11px;color:#94a3b8;background:#0f1117;border-radius:6px;padding:8px;line-height:1.5;max-height:80px;overflow:hidden;position:relative;margin-bottom:8px;white-space:pre-wrap;word-break:break-word}
.plan-box::after{content:'';position:absolute;bottom:0;left:0;right:0;height:22px;background:linear-gradient(transparent,#0f1117)}
.revision-note{font-size:11px;color:#f59e0b;border:1px solid #f59e0b33;border-radius:6px;padding:6px 8px;margin-bottom:8px}

/* Buttons */
.btn-row{display:flex;gap:6px;margin-bottom:4px}
.btn{flex:1;padding:7px 10px;border-radius:6px;font-size:12px;font-weight:500;border:none;cursor:pointer;transition:opacity .15s;-webkit-tap-highlight-color:transparent}
.btn:hover{opacity:.85}.btn:active{opacity:.7}
.btn-approve{background:#166534;color:#86efac}
.btn-revise{background:#1e2433;color:#94a3b8;border:1px solid #334155}
.btn-unblock{background:#1c2a3a;color:#60a5fa;width:100%}
.btn-send{background:#7c1d1d;color:#fca5a5;width:100%;padding:7px;border-radius:6px;border:none;font-size:12px;cursor:pointer;margin-top:4px;font-weight:500}
.revise-form{display:none;flex-direction:column;gap:4px;margin-top:4px}
.note-input{width:100%;background:#0f1117;border:1px solid #334155;border-radius:6px;padding:7px 8px;color:#e2e8f0;font-size:12px;resize:none;-webkit-appearance:none}
.note-input:focus{outline:none;border-color:#60a5fa}

.running{display:flex;align-items:center;gap:6px;font-size:11px;color:#38bdf8;margin-top:6px}
.spinner{display:inline-block;width:10px;height:10px;border:1.5px solid #1e4a6e;border-top-color:#38bdf8;border-radius:50%;animation:spin .8s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
.empty-col{border:1px dashed #1e2433;border-radius:8px;padding:16px;text-align:center;font-size:12px;color:#2d3748}

/* Chat section */
.chat-section{padding:0 20px 32px;border-top:1px solid #1e2433}
.section-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#475569;padding:14px 0 8px;font-weight:600}
.chat-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #141922}
.chat-desc{flex:1;font-size:12px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chat-age{font-size:11px;color:#475569;white-space:nowrap}
</style>
</head>
<body>
<header>
  <h1><span class="pulse"></span>&nbsp;CT112 Agent <span>/ Dashboard</span></h1>
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
    <div class="stats" id="stats">Loading...</div>
    <div class="last-update" id="last-update"></div>
  </div>
</header>
<div class="board" id="board">
  <div style="padding:40px;color:#334155;font-size:13px">Loading...</div>
</div>
<div class="chat-section">
  <div class="section-title">Recent chat</div>
  <div id="chat-list"></div>
</div>

<script>
const STATUS_META = ${JSON.stringify(STATUS_META)};
const BOARD_COLS = ${JSON.stringify(BOARD_COLS)};

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(m/60), dy = Math.floor(h/24);
  if (dy > 0) return dy+'d ago'; if (h > 0) return h+'h ago'; if (m > 0) return m+'m ago'; return 'just now';
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function lastLine(p) {
  if (!p) return '';
  const lines = p.split('\\n').filter(Boolean);
  return lines[lines.length-1] || '';
}

function cardHtml(t) {
  const meta = STATUS_META[t.status] || {label:t.status,color:'#64748b'};
  const bc = t.created_by === 'agent' ? 'badge-agent' : 'badge-user';
  let bl = t.created_by === 'agent' ? '🤖 agent' : '👤 user';
  if (t.auto_execute) bl += ' ⚡';
  const title = esc(t.title || t.description.substring(0, 80));
  const lp = esc(lastLine(t.progress));
  let extra = '';

  if (t.status === 'awaiting_approval') {
    extra = \`<div class="plan-box">\${esc(t.plan||'').substring(0,600)}</div>
      <div class="btn-row">
        <button class="btn btn-approve" onclick="approve(\${t.id})">✅ Approve</button>
        <button class="btn btn-revise" onclick="showRevise(\${t.id})">✏️ Revise</button>
      </div>
      <div class="revise-form" id="rf-\${t.id}">
        <textarea class="note-input" id="rn-\${t.id}" rows="2" placeholder="What to change?"></textarea>
        <button class="btn-send" onclick="sendRevise(\${t.id})">Send revision notes</button>
      </div>\`;
  } else if (t.status === 'needs_revision' && t.rejection_notes) {
    extra = \`<div class="revision-note">💬 \${esc(t.rejection_notes)}</div>\`;
  } else if (t.status === 'blocked') {
    extra = (lp ? \`<div class="progress-line">\${lp}</div>\` : '') +
      \`<button class="btn btn-unblock" onclick="unblock(\${t.id})">▶ Unblock</button>\`;
  }

  return \`<div class="card\${t.status==='awaiting_approval'?' card-hl':''}">
    <div class="card-top"><div class="card-title">\${title}</div><span class="badge \${bc}">\${bl}</span></div>
    <div class="card-meta">
      <span class="chip" style="background:\${meta.color}1a;color:\${meta.color}">\${meta.label}</span>
      <span class="age">\${timeAgo(t.updated_at)}</span>
    </div>
    \${t.status==='in_progress'&&lp?'<div class="progress-line">'+lp+'</div>':''}
    \${extra}
    \${t.status==='in_progress'?'<div class="running"><span class="spinner"></span> Working...</div>':''}
  </div>\`;
}

function render(tasks, chatTasks) {
  // Group by status
  const by = {};
  Object.keys(STATUS_META).forEach(s => by[s] = []);
  tasks.forEach(t => { const s = t.status||'backlog'; if (!by[s]) by[s]=[]; by[s].push(t); });

  // Stats
  const active = (by.in_progress||[]).length;
  const pending = (by.awaiting_approval||[]).length;
  const done = (by.done||[]).length;
  document.getElementById('stats').innerHTML =
    '<b>'+active+'</b>&nbsp;in progress&nbsp;&nbsp;<b>'+pending+'</b>&nbsp;awaiting review&nbsp;&nbsp;<b>'+done+'</b>&nbsp;done';

  // Board
  const colsHtml = BOARD_COLS.map(status => {
    const items = by[status]||[];
    const meta = STATUS_META[status];
    return '<div class="column">' +
      '<div class="col-header"><span>'+meta.label+'</span>' +
      '<span class="col-count" style="color:'+meta.color+'">'+items.length+'</span></div>' +
      '<div class="cards">' +
      (items.length ? items.map(cardHtml).join('') : '<div class="empty-col">—</div>') +
      '</div></div>';
  }).join('');
  document.getElementById('board').innerHTML = colsHtml;

  // Chat list
  const chatHtml = chatTasks.length
    ? chatTasks.map(t =>
        '<div class="chat-row">' +
        '<span class="chip" style="background:#34d39911;color:#34d399;font-size:10px">'+esc(t.status.toUpperCase())+'</span>' +
        '<span class="chat-desc">'+esc(t.description)+'</span>' +
        '<span class="chat-age">'+timeAgo(t.updated_at)+'</span>' +
        '</div>'
      ).join('')
    : '<div style="font-size:12px;color:#334155;padding:8px 0">No chat tasks yet</div>';
  document.getElementById('chat-list').innerHTML = chatHtml;

  document.getElementById('last-update').textContent = 'Updated '+new Date().toLocaleTimeString();
}

function approve(id) {
  fetch('/api/tasks/'+id+'/approve',{method:'POST'}).then(refresh);
}
function showRevise(id) {
  const f = document.getElementById('rf-'+id);
  f.style.display = f.style.display==='flex' ? 'none' : 'flex';
  if (f.style.display==='flex') document.getElementById('rn-'+id).focus();
}
function sendRevise(id) {
  const notes = document.getElementById('rn-'+id).value;
  fetch('/api/tasks/'+id+'/reject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes})})
    .then(refresh);
}
function unblock(id) {
  fetch('/api/tasks/'+id+'/unblock',{method:'POST'}).then(refresh);
}

let refreshTimer;
function refresh() {
  clearTimeout(refreshTimer);
  Promise.all([
    fetch('/api/tasks').then(r=>r.json()),
    fetch('/api/chat').then(r=>r.json())
  ]).then(([tasks, chat]) => {
    render(tasks, chat);
  }).catch(e => console.error('refresh error', e));
  refreshTimer = setTimeout(refresh, 5000);
}

refresh();
</script>
</body>
</html>`;

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost')

  if (u.pathname === '/api/tasks') {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'})
    return res.end(JSON.stringify(db.prepare("SELECT * FROM tasks WHERE type='work' ORDER BY updated_at DESC LIMIT 300").all()))
  }

  if (u.pathname === '/api/chat') {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'})
    return res.end(JSON.stringify(db.prepare("SELECT * FROM tasks WHERE (type='chat' OR type IS NULL) ORDER BY updated_at DESC LIMIT 8").all()))
  }

  const m = u.pathname.match(/^\/api\/tasks\/(\d+)\/(approve|reject|unblock)$/)
  if (m && req.method === 'POST') {
    const id = parseInt(m[1]), action = m[2]
    if (action === 'approve') {
      db.prepare("UPDATE tasks SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='awaiting_approval'").run(id)
      res.writeHead(200, {'Content-Type':'application/json'}); return res.end('{"ok":true}')
    }
    if (action === 'unblock') {
      db.prepare("UPDATE tasks SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='blocked'").run(id)
      res.writeHead(200, {'Content-Type':'application/json'}); return res.end('{"ok":true}')
    }
    if (action === 'reject') {
      let body = ''
      req.on('data', d => body += d)
      req.on('end', () => {
        let notes = ''; try { notes = JSON.parse(body).notes||'' } catch(e) {}
        db.prepare("UPDATE tasks SET status='needs_revision', rejection_notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(notes, id)
        res.writeHead(200, {'Content-Type':'application/json'}); res.end('{"ok":true}')
      }); return
    }
  }

  if (u.pathname === '/' || u.pathname === '') {
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'})
    return res.end(SHELL)
  }

  res.writeHead(404); res.end('Not found')
})

server.listen(PORT, '0.0.0.0', () => {
  console.log('[' + new Date().toISOString() + '] UI server on :' + PORT)
})

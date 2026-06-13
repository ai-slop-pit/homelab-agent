require('dotenv').config({ path: '/opt/claude-agent/.env' })
const http = require('http')
const { getDatabase } = require('../lib/db')

const db = getDatabase()
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

<div id="schedules-section" style="margin-top:32px;padding:20px;background:#1e293b;border-radius:8px;border:1px solid #334155">
  <div class="section-title" style="margin-top:0;color:#e2e8f0">⏱️ Scheduled Work</div>
  <div id="schedules-list" style="font-size:13px;color:#cbd5e1"></div>
  <div style="margin-top:20px;padding-top:20px;border-top:1px solid #334155">
    <div class="section-title" style="margin:0 0 12px 0;font-size:12px;color:#94a3b8">📋 Recent Logs</div>
    <div id="logs-display" style="font-size:11px;font-family:monospace;color:#64748b">Loading logs...</div>
  </div>
</div>

<div id="taskModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);align-items:center;justify-content:center;z-index:1000;padding:20px" onclick="if(event.target===this)closeModal()">
  <div style="background:#1e293b;border-radius:12px;width:100%;max-width:700px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,0.5);border:1px solid #334155">
    <!-- Header -->
    <div style="padding:24px;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:start">
      <div style="flex:1">
        <div id="taskTitle" style="font-size:20px;font-weight:600;color:#e2e8f0;margin-bottom:8px"></div>
        <div style="display:flex;gap:12px">
          <span id="taskStatus" style="background:#0ea5e9;color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500"></span>
        </div>
      </div>
      <button onclick="closeModal()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#64748b;line-height:1;padding:0" title="Close">✕</button>
    </div>
    <!-- Content -->
    <div style="flex:1;overflow-y:auto;padding:24px">
      <div style="margin-bottom:20px">
        <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Description</div>
        <div id="taskDescription" style="background:#0f172a;padding:12px;border-radius:8px;font-size:13px;line-height:1.6;color:#cbd5e1;border:1px solid #334155;word-break:break-word"></div>
      </div>
      <div style="margin-bottom:20px">
        <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Metadata</div>
        <div id="taskMeta" style="background:#0f172a;padding:12px;border-radius:8px;font-size:12px;color:#94a3b8;border:1px solid #334155"></div>
      </div>
      <div id="taskPlanSection" style="margin-bottom:20px;display:none">
        <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Plan</div>
        <div id="taskPlan" style="background:#0f172a;padding:12px;border-radius:8px;font-family:monospace;font-size:12px;line-height:1.6;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;border:1px solid #334155;max-height:150px;overflow-y:auto"></div>
      </div>
      <div id="taskProgressSection" style="margin-bottom:20px;display:none">
        <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Progress</div>
        <div id="taskProgress" style="background:#0f172a;padding:12px;border-radius:8px;font-size:12px;line-height:1.6;color:#cbd5e1;border:1px solid #334155;white-space:pre-wrap;word-break:break-word;max-height:150px;overflow-y:auto"></div>
      </div>
      <div id="taskResultSection" style="margin-bottom:20px;display:none">
        <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Result</div>
        <div id="taskResult" style="background:#0f172a;padding:12px;border-radius:8px;font-size:13px;color:#cbd5e1;line-height:1.6;border:1px solid #334155;word-break:break-word;max-height:200px;overflow-y:auto"></div>
      </div>
      <div id="taskRejectionSection" style="margin-bottom:20px;display:none">
        <div style="font-size:12px;font-weight:600;color:#f59e0b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Rejection Notes</div>
        <div id="taskRejection" style="background:#0f172a;padding:12px;border-radius:8px;border:1px solid #f59e0b33;font-size:12px;line-height:1.6;color:#f59e0b;white-space:pre-wrap;word-break:break-word;max-height:150px;overflow-y:auto"></div>
      </div>
      <div id="taskCommitsSection" style="margin-bottom:20px;display:none">
        <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Commits & Changes</div>
        <div id="taskCommits" style="background:#0f172a;padding:12px;border-radius:8px;border:1px solid #334155;font-size:12px;color:#cbd5e1;max-height:150px;overflow-y:auto"></div>
      </div>
    </div>
    <!-- Footer -->
    <div style="padding:16px 24px;border-top:1px solid #334155;display:flex;gap:12px;justify-content:space-between">
      <div style="display:flex;gap:8px">
        <button onclick="rejectTask()" style="padding:8px 16px;border:1px solid #dc2626;background:transparent;border-radius:6px;cursor:pointer;color:#ef4444;font-weight:500;font-size:14px">❌ Reject</button>
        <button onclick="deleteTask()" style="padding:8px 16px;border:1px solid #dc2626;background:transparent;border-radius:6px;cursor:pointer;color:#ef4444;font-weight:500;font-size:14px">🗑️ Delete</button>
      </div>
      <button onclick="closeModal()" style="padding:8px 16px;border:1px solid #334155;background:#0f172a;border-radius:6px;cursor:pointer;color:#cbd5e1;font-weight:500;font-size:14px">Close</button>
    </div>
  </div>
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

  return \`<div class="card\${t.status==='awaiting_approval'?' card-hl':''}" onclick="location.hash='#task/\${t.id}'">
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

function render(tasks, chatTasks, metrics) {
  // Group by status - only work and improvement tasks, not chat
  const by = {};
  Object.keys(STATUS_META).forEach(s => by[s] = []);
  tasks.filter(t => t.type === 'work' || t.type === 'improvement').forEach(t => { const s = t.status||'backlog'; if (!by[s]) by[s]=[]; by[s].push(t); });

  // Stats
  const active = (by.in_progress||[]).length;
  const pending = (by.awaiting_approval||[]).length;
  const done = (by.done||[]).length;
  const failed = (by.failed||[]).length;
  let statsHtml = '<b>'+active+'</b>&nbsp;in progress&nbsp;&nbsp;<b>'+pending+'</b>&nbsp;awaiting review&nbsp;&nbsp;<b>'+done+'</b>&nbsp;done';
  if (failed > 0) statsHtml += '&nbsp;&nbsp;<b style="color:#ef4444">'+failed+'</b>&nbsp;failed';
  if (metrics && metrics.reflector_cycles > 0) statsHtml += '&nbsp;&nbsp;<b style="color:#4ade80">🤖</b>&nbsp;reflector active';
  document.getElementById('stats').innerHTML = statsHtml;

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
function runScheduleNow(jobName) {
  fetch('/api/schedules/run', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({job:jobName})})
    .then(r => r.json())
    .then(data => {
      alert('Started: '+jobName+'. Check logs in a moment');
      setTimeout(loadSchedules, 2000);
    })
    .catch(e => alert('Error: '+e));
}

function loadLogs() {
  fetch('/api/logs/reflector').then(r => r.json()).then(data => {
    const logLines = data.logs.split('\\n').map(l => l.trim()).filter(Boolean);
    const html = '<div style="font-size:11px;font-family:monospace;color:#94a3b8;background:#0f172a;padding:12px;border-radius:6px;max-height:200px;overflow-y:auto;border:1px solid #334155">' +
      logLines.map(l => '<div>'+esc(l)+'</div>').join('') +
      '</div>';
    document.getElementById('logs-display').innerHTML = html;
  }).catch(e => console.error('logs error', e));
}

function loadSchedules() {
  fetch('/api/schedules').then(r => r.json()).then(schedules => {
    const html = schedules.jobs.map(job =>
      '<div style="margin:12px 0;padding:12px;background:#0f172a;border-radius:6px;border-left:4px solid #0ea5e9">' +
      '<div style="display:flex;justify-content:space-between;align-items:start">' +
      '<div>' +
      '<div style="font-weight:600;color:#e2e8f0">'+esc(job.name)+'</div>' +
      '<div style="font-size:12px;color:#94a3b8;margin-top:4px">📅 '+esc(job.schedule)+'</div>' +
      '<div style="font-size:12px;color:#94a3b8">⏱️ Last: '+esc(job.lastRun || 'never')+'</div>' +
      '<div style="font-size:12px;color:#94a3b8">⏳ Next: '+esc(job.nextRun)+'</div>' +
      '</div>' +
      '<button onclick="runScheduleNow(\\'reflector\\')" style="padding:6px 12px;background:#0ea5e9;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:500;white-space:nowrap">▶ Run Now</button>' +
      '</div>' +
      '</div>'
    ).join('');
    document.getElementById('schedules-list').innerHTML = html || '<div style="color:#64748b">No schedules configured</div>';
    loadLogs();
  }).catch(e => console.error('schedules error', e));
}

function refresh() {
  clearTimeout(refreshTimer);
  Promise.all([
    fetch('/api/tasks').then(r=>r.json()),
    fetch('/api/chat').then(r=>r.json()),
    fetch('/api/metrics').then(r=>r.json()).catch(() => ({}))
  ]).then(([tasks, chat, metrics]) => {
    render(tasks, chat, metrics);
    openModalFromHash(tasks, chat);
    loadSchedules();
  }).catch(e => console.error('refresh error', e));
  refreshTimer = setTimeout(refresh, 5000);
}

let tasksCache = [], chatCache = [], currentTaskId = null;
function closeModal() {
  location.hash = '';
  document.getElementById('taskModal').style.display = 'none';
}
function rejectTask() {
  if (!currentTaskId) return;
  fetch('/api/tasks/'+currentTaskId+'/reject', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({notes:'Rejected'})}).then(refresh);
  closeModal();
}
function deleteTask() {
  if (!currentTaskId) return;
  if (!confirm('Delete this task? This cannot be undone.')) return;
  fetch('/api/tasks/'+currentTaskId+'/delete', {method:'POST'}).then(refresh).catch(e => alert('Delete failed: '+e));
  closeModal();
}
function openModalFromHash(tasks, chat) {
  tasksCache = tasks; chatCache = chat;
  const match = location.hash.match(/#task\\/(\\d+)/);
  const modal = document.getElementById('taskModal');
  if (!match) { modal.style.display = 'none'; return; }
  const taskId = parseInt(match[1]);
  currentTaskId = taskId;
  const task = [...tasks, ...chat].find(t => t.id === taskId);
  if (!task) { modal.style.display = 'none'; return; }
  modal.style.display = 'flex';
  document.getElementById('taskTitle').textContent = esc(task.title || task.description.substring(0,80));
  document.getElementById('taskDescription').textContent = esc(task.description || '(no description)');
  document.getElementById('taskStatus').textContent = task.status || 'unknown';

  const meta = [
    task.type ? '<b>Type:</b> '+esc(task.type) : '',
    task.created_by ? '<b>Created by:</b> '+esc(task.created_by) : '',
    task.created_at ? '<b>Created:</b> '+esc(task.created_at.substring(0,19)) : '',
    task.updated_at ? '<b>Updated:</b> '+esc(task.updated_at.substring(0,19)) : '',
    task.significance ? '<b>Significance:</b> '+esc(task.significance) : '',
    task.auto_execute ? '<b>Auto-execute:</b> '+esc(task.auto_execute ? 'Yes' : 'No') : '',
    task.priority ? '<b>Priority:</b> '+esc(task.priority) : '',
  ].filter(Boolean).join('<br>');
  document.getElementById('taskMeta').innerHTML = meta || '(no metadata)';

  if (task.plan) {
    document.getElementById('taskPlanSection').style.display = 'block';
    document.getElementById('taskPlan').textContent = task.plan;
  } else {
    document.getElementById('taskPlanSection').style.display = 'none';
  }

  if (task.progress) {
    document.getElementById('taskProgressSection').style.display = 'block';
    document.getElementById('taskProgress').textContent = task.progress;
  } else {
    document.getElementById('taskProgressSection').style.display = 'none';
  }

  if (task.result) {
    document.getElementById('taskResultSection').style.display = 'block';
    let resultHtml = task.result;
    if (task.result.startsWith('Commit:')) {
      const hashMatch = task.result.match(/Commit: ([a-f0-9]{7})/);
      const urlMatch = task.result.match(/URL: (https:\\/\\/[^\\s]+)/);
      if (hashMatch && urlMatch && urlMatch[1] !== 'no-github-link') {
        const hash = hashMatch[1];
        const url = urlMatch[1];
        const idx = task.result.indexOf('\\n\\n');
        const desc = idx > 0 ? task.result.substring(idx + 4) : task.result.substring(10);
        resultHtml = '<a href="' + url + '" target="_blank" style="color:#4ade80;text-decoration:none;font-weight:bold">📝 Commit ' + esc(hash) + '</a>&nbsp;<a href="' + url + '" target="_blank" style="font-size:12px;color:#64748b">' + esc(url.split('/commit/')[1] || url) + '</a><br><br>' + esc(desc);
      } else if (hashMatch) {
        const hash = hashMatch[1];
        const idx = task.result.indexOf('\\n\\n');
        const desc = idx > 0 ? task.result.substring(idx + 4) : task.result.substring(10);
        resultHtml = '<span style="color:#4ade80;font-weight:bold">📝 Commit ' + esc(hash) + '</span><br><br>' + esc(desc);
      }
    } else if (task.result.startsWith('http')) {
      resultHtml = '<a href="'+esc(task.result)+'" target="_blank" style="color:#0ea5e9;text-decoration:none">'+esc(task.result)+'</a>';
    }
    document.getElementById('taskResult').innerHTML = resultHtml;
  } else {
    document.getElementById('taskResultSection').style.display = 'none';
  }

  if (task.rejection_notes) {
    document.getElementById('taskRejectionSection').style.display = 'block';
    document.getElementById('taskRejection').textContent = task.rejection_notes;
  } else {
    document.getElementById('taskRejectionSection').style.display = 'none';
  }

  fetch('/api/tasks/'+taskId+'/commits').then(r => r.json()).then(data => {
    if (data.commits && data.commits.length > 0) {
      document.getElementById('taskCommitsSection').style.display = 'block';
      const html = data.commits.map(c => '<div style="padding:6px 0;border-bottom:1px solid #334155;font-family:monospace"><span style="color:#4ade80">'+esc(c.hash)+'</span> '+esc(c.message)+'</div>').join('');
      document.getElementById('taskCommits').innerHTML = html;
    } else {
      document.getElementById('taskCommitsSection').style.display = 'none';
    }
  }).catch(e => console.error('commits error', e));
}

window.addEventListener('hashchange', () => openModalFromHash(tasksCache, chatCache));

refresh();
</script>
</body>
</html>`;

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost')

  if (u.pathname === '/api/tasks') {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'})
    return res.end(JSON.stringify(db.prepare("SELECT * FROM tasks ORDER BY updated_at DESC LIMIT 300").all()))
  }

  if (u.pathname === '/api/schedules') {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'})
    const fs = require('fs');
    let jobs = [];
    try {
      const cronFile = fs.readFileSync('/opt/claude-agent/.cron', 'utf8');
      const lines = cronFile.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      let cronLog = '';
      try { cronLog = fs.readFileSync('/opt/claude-agent/logs/cron.log', 'utf8'); } catch(e) {}
      jobs = lines.map(line => {
        const parts = line.split(' ');
        const schedule = parts.slice(0, 5).join(' ');
        const cmd = parts.slice(5).join(' ');
        const name = cmd.includes('reflector') ? '🔍 Reflector (Hourly Analysis)' : cmd;
        const logs = cronLog.split('\n').filter(l => l.includes('reflector')).reverse();
        const lastRun = logs[0] ? logs[0].substring(0, 19) : 'never';
        const nextRun = 'Every hour at :00';
        return { name, schedule, lastRun, nextRun };
      });
    } catch(e) { console.error(e); }
    return res.end(JSON.stringify({ jobs }))
  }

  if (u.pathname === '/api/logs/reflector') {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'})
    const fs = require('fs');
    let logs = '';
    try { logs = fs.readFileSync('/opt/claude-agent/logs/reflector.log', 'utf8'); } catch(e) {}
    const lines = logs.split('\n').reverse().slice(0, 30).reverse();
    return res.end(JSON.stringify({ logs: lines.join('\n') }))
  }

  const m2 = u.pathname.match(/^\/api\/tasks\/(\d+)\/commits$/)
  if (m2) {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'})
    const { execSync } = require('child_process');
    const taskId = m2[1];
    let commits = [];
    try {
      const output = execSync(`cd /opt/claude-agent && (git log --all --oneline | grep -E "#${taskId}|task/${taskId}|task.*/.*${taskId}" || true)`, {encoding:'utf8'});
      commits = output.trim().split('\n').filter(Boolean).slice(0, 10).map(line => {
        const [hash, ...msg] = line.split(' ');
        return { hash: hash.substring(0, 7), message: msg.join(' ') };
      });
    } catch(e) { console.error(e); }
    return res.end(JSON.stringify({ commits }))
  }

  if (u.pathname === '/api/metrics') {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'})
    try {
      const rows = db.prepare("SELECT key, value FROM metrics").all()
      const metrics = {
        tasks_planned: 0,
        tasks_completed: 0,
        tasks_failed: 0,
        reflector_cycles: 0,
        avg_plan_time_ms: 0,
        reflector_low_ideas: 0,
        reflector_medium_ideas: 0,
        reflector_high_ideas: 0,
      }
      rows.forEach(r => metrics[r.key] = r.value)
      if (metrics.plan_count && metrics.total_plan_time_ms) {
        metrics.avg_plan_time_ms = Math.round(metrics.total_plan_time_ms / metrics.plan_count)
      }
      return res.end(JSON.stringify(metrics))
    } catch(e) {
      return res.end(JSON.stringify({ error: e.message }))
    }
  }

  if (u.pathname === '/api/schedules/run' && req.method === 'POST') {
    res.writeHead(200, {'Content-Type':'application/json'})
    let body = ''
    req.on('data', d => body += d)
    req.on('end', () => {
      let job = 'reflector'; try { job = JSON.parse(body).job; } catch(e) {}
      const { spawn } = require('child_process');
      spawn('node', ['reflector/reflector.js', 'once'], {cwd: '/opt/claude-agent', detached: true});
      res.end(JSON.stringify({ok: true, message: 'Reflector started in background'}))
    })
    return
  }

  if (u.pathname === '/api/chat') {
    res.writeHead(200, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'})
    return res.end(JSON.stringify(db.prepare("SELECT * FROM tasks WHERE (type='chat' OR type IS NULL) ORDER BY updated_at DESC LIMIT 8").all()))
  }

  const m = u.pathname.match(/^\/api\/tasks\/(\d+)\/(approve|reject|unblock|delete)$/)
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
    if (action === 'delete') {
      db.prepare("DELETE FROM tasks WHERE id=?").run(id)
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

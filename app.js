const $ = s => document.querySelector(s); const avatar = $('#avatar'); const status = $('#status'); let files = [];
const states = { idle: ['assets/avatar/idle.png', 'Ready when you are'], listening: ['assets/avatar/listening.png', 'Listening to your question'], searching: ['assets/avatar/searching.png', 'Searching your workspace'], success: ['assets/avatar/success.png', 'Answer ready'] };
function setState(name) { [avatar.src, status.textContent] = states[name]; avatar.classList.toggle('pulse', name === 'searching'); }
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function drawFiles() { $('#fileList').innerHTML = files.length ? files.map(f => `<div class="file">⌁ <span>${escapeHtml(f.name)}</span><small>${Math.ceil(f.size / 1024)} KB</small></div>`).join('') : '<p class="hint">No files staged yet.</p>'; $('#pendingFiles').textContent = files.length ? `${files.length} file${files.length > 1 ? 's' : ''} ready with this query` : ''; }
function addFiles(list) { files = [...files, ...list]; drawFiles(); }
function openFerpaModal(data) {
  $('#ferpaTitle').textContent = data.title || 'Prompt blocked';
  $('#ferpaWhy').textContent = data.reason || 'This prompt was blocked because it includes student information.';
  const findings = Array.isArray(data.findings) ? data.findings : [];
  $('#ferpaFindings').innerHTML = findings.length
    ? findings.map(finding => `<li><strong>${escapeHtml(finding.label || 'Student information')}</strong><span>${escapeHtml(finding.detail || '')}</span></li>`).join('')
    : '<li><strong>Student information</strong><span>Remove student identifiers such as IDs, phone numbers, and email addresses, then send the prompt again.</span></li>';
  $('#ferpaModal').hidden = false;
  $('main').inert = true;
  $('#ferpaAck').focus();
}
function closeFerpaModal() {
  const modal = $('#ferpaModal');
  if (modal.hidden) return;
  modal.hidden = true;
  $('main').inert = false;
  $('#query').focus();
}
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === button)); $('#companion').hidden = button.dataset.view !== 'companion'; $('#files').hidden = button.dataset.view !== 'files'; });
$('#addFiles').onclick = () => $('#fileInput').click(); $('#fileInput').onchange = e => addFiles(e.target.files);
$('#query').oninput = () => setState($('#query').value.trim() ? 'listening' : 'idle');
$('#dropzone').ondragover = e => { e.preventDefault(); $('#dropzone').classList.add('over'); }; $('#dropzone').ondragleave = () => $('#dropzone').classList.remove('over'); $('#dropzone').ondrop = e => { e.preventDefault(); $('#dropzone').classList.remove('over'); addFiles(e.dataTransfer.files); };
$('#queryForm').onsubmit = async e => {
  e.preventDefault();
  if (!$('#ferpaModal').hidden) return;
  const query = $('#query').value.trim();
  if (!query) return;
  setState('searching');
  $('.send').disabled = true;
  try {
    const res = await fetch('/api/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, files: files.map(({ name, size }) => ({ name, size })) }) });
    const data = await res.json();
    if (data.blocked) { openFerpaModal(data); setState('listening'); return; }
    if (!res.ok) throw new Error(data.error);
    $('#conversation').insertAdjacentHTML('beforeend', `<article class="message user">${escapeHtml(query)}</article>`);
    $('#query').value = '';
    $('#conversation').insertAdjacentHTML('beforeend', `<article class="message answer"><small>${data.demo ? 'DEMO MODE' : 'FIX-IT'}</small>${escapeHtml(data.answer)}</article>`);
    setState('success');
  } catch (err) {
    $('#conversation').insertAdjacentHTML('beforeend', `<article class="message error">${escapeHtml(err.message)}</article>`);
    setState($('#query').value.trim() ? 'listening' : 'idle');
  } finally {
    $('.send').disabled = false;
    $('#conversation').scrollTop = $('#conversation').scrollHeight;
  }
};
$('#ferpaAck').onclick = () => closeFerpaModal();
$('#ferpaModal').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); closeFerpaModal(); } });
$('#voice').onclick = () => { const recognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!recognition) return alert('Voice input is not available in this browser.'); const r = new recognition(); r.onstart = () => { $('#voice').textContent = '● Listening'; setState('listening'); }; r.onresult = e => { $('#query').value += ($('#query').value ? ' ' : '') + e.results[0][0].transcript; }; r.onend = () => { $('#voice').textContent = '⌁ Voice'; setState('listening'); }; r.start(); };
$('#setup').onclick = () => $('#guide').showModal(); $('#closeGuide').onclick = () => $('#guide').close(); drawFiles();

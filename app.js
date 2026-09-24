const $ = s => document.querySelector(s); const avatar = $('#avatar'); const status = $('#status'); let files = [];
const states = { idle: ['assets/avatar/idle.png', 'Ready when you are'], listening: ['assets/avatar/listening.png', 'Listening to your question'], searching: ['assets/avatar/searching.png', 'Searching your workspace'], success: ['assets/avatar/success.png', 'Answer ready'] };
function setState(name) { [avatar.src, status.textContent] = states[name]; avatar.classList.toggle('pulse', name === 'searching'); }
function drawFiles() { $('#fileList').innerHTML = files.length ? files.map(f => `<div class="file">⌁ <span>${f.name}</span><small>${Math.ceil(f.size / 1024)} KB</small></div>`).join('') : '<p class="hint">No files staged yet.</p>'; $('#pendingFiles').textContent = files.length ? `${files.length} file${files.length > 1 ? 's' : ''} ready with this query` : ''; }
function addFiles(list) { files = [...files, ...list]; drawFiles(); }
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b === button)); $('#companion').hidden = button.dataset.view !== 'companion'; $('#files').hidden = button.dataset.view !== 'files'; });
$('#addFiles').onclick = () => $('#fileInput').click(); $('#fileInput').onchange = e => addFiles(e.target.files);
$('#query').oninput = () => setState($('#query').value.trim() ? 'listening' : 'idle');
$('#dropzone').ondragover = e => { e.preventDefault(); $('#dropzone').classList.add('over'); }; $('#dropzone').ondragleave = () => $('#dropzone').classList.remove('over'); $('#dropzone').ondrop = e => { e.preventDefault(); $('#dropzone').classList.remove('over'); addFiles(e.dataTransfer.files); };
$('#queryForm').onsubmit = async e => { e.preventDefault(); const query = $('#query').value.trim(); if (!query) return; $('#conversation').insertAdjacentHTML('beforeend', `<article class="message user">${escapeHtml(query)}</article>`); $('#query').value = ''; setState('searching'); $('.send').disabled = true; showUpdateNotice(); try { const res = await fetch('/api/query', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({query, files: files.map(({name,size}) => ({name,size}))}) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); $('#conversation').insertAdjacentHTML('beforeend', `<article class="message answer"><small>${data.demo ? 'DEMO MODE' : 'FIX-IT'}</small>${escapeHtml(data.answer)}</article>`); setState('success'); } catch (err) { $('#conversation').insertAdjacentHTML('beforeend', `<article class="message error">${escapeHtml(err.message)}</article>`); setState('idle'); } finally { $('.send').disabled = false; showUpdateNotice(); $('#conversation').scrollTop = $('#conversation').scrollHeight; } };
$('#voice').onclick = () => { const recognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!recognition) return alert('Voice input is not available in this browser.'); const r = new recognition(); r.onstart = () => { $('#voice').textContent = '● Listening'; setState('listening'); }; r.onresult = e => { $('#query').value += ( $('#query').value ? ' ' : '') + e.results[0][0].transcript; }; r.onend = () => { $('#voice').textContent = '⌁ Voice'; setState('listening'); }; r.start(); };
function runningInDesktopApp() { return /\bElectron\b/.test(navigator.userAgent); }
function formatBridgeError(error, fallback = 'Could not save the API key. Close any other Purrplexity windows and try Save & connect again.') {
  const raw = error && typeof error.message === 'string' ? error.message : '';
  const cleaned = raw.replace(/^Error invoking remote method '[^']+':\s*/i, '').replace(/^Error:\s*/, '').trim();
  return cleaned || fallback;
}
function connectionStatus(setup) {
  if (!setup?.connected) return 'Not connected yet. Add your API key below.';
  if (setup.protection === 'local') return 'Connected with local encryption because operating-system credential storage is unavailable. You can replace the saved key or update your Vector Store.';
  return 'Connected. You can replace the saved key or update your Vector Store.';
}
function savedMessage(result) {
  if (result?.protection === 'local') return 'Connected. Operating-system credential storage is unavailable, so the key was encrypted locally in this app\'s data folder. Your next question will use your OpenAI account.';
  return 'Connected. Your next question will use your OpenAI account.';
}
async function showSetup() {
  const guide = $('#guide'); const setupStatus = $('#setupStatus'); const bridge = window.purrplexity;
  $('#setupResult').textContent = '';
  if (!bridge) {
    setupStatus.textContent = runningInDesktopApp()
      ? 'The setup bridge did not load, so the API key field is unavailable. Quit this copy and install Purrplexity 1.0.3 or newer from GitHub Releases (the Setup installer, or the matching portable exe).'
      : 'Browser development mode: copy .env.example to .env, add your key, then restart.';
    $('#setupForm').hidden = true;
  } else {
    try {
      const setup = await bridge.getSetupStatus();
      setupStatus.textContent = connectionStatus(setup);
      $('#vectorStoreId').value = setup.vectorStoreId || '';
      $('#model').value = setup.model || 'gpt-5-mini';
      $('#setupForm').hidden = false;
    } catch (error) {
      setupStatus.textContent = 'Could not read the saved connection. Paste your API key and select Save & connect.';
      $('#setupResult').textContent = formatBridgeError(error);
      $('#setupForm').hidden = false;
    }
  }
  if (!guide.open) guide.showModal();
}
$('#setup').onclick = showSetup; $('#closeGuide').onclick = () => $('#guide').close();
$('#setupForm').onsubmit = async event => {
  event.preventDefault(); const button = $('#saveSetup'); button.disabled = true; $('#setupResult').textContent = 'Saving securely…';
  try {
    if (!window.purrplexity?.saveSetup) throw new Error('The setup bridge is not available in this window. Install Purrplexity 1.0.3 or newer and open the desktop app.');
    const result = await window.purrplexity.saveSetup({ apiKey: $('#apiKey').value, vectorStoreId: $('#vectorStoreId').value, model: $('#model').value });
    $('#apiKey').value = ''; $('#setupStatus').textContent = connectionStatus(result); $('#setupResult').textContent = savedMessage(result); $('#route').textContent = 'OpenAI connected';
  } catch (error) { $('#setupResult').textContent = formatBridgeError(error); } finally { button.disabled = false; }
};
let pendingUpdate = null;
function queryBusy() { return $('.send').disabled; }
function showUpdateNotice() {
  const notice = $('#updateNotice');
  if (!notice) return;
  if (!pendingUpdate || (pendingUpdate.state !== 'ready' && pendingUpdate.state !== 'error')) { notice.hidden = true; return; }
  const version = pendingUpdate.version ? `Version ${pendingUpdate.version}` : 'An update';
  if (pendingUpdate.state === 'error') {
    $('#updateNoticeText').textContent = `${pendingUpdate.message || 'The update could not be installed.'} You can also download the latest build from GitHub Releases.`;
  } else if (queryBusy()) {
    $('#updateNoticeText').textContent = `${version} is ready. Purrplexity will not restart during this question. Install it when you are done.`;
  } else {
    $('#updateNoticeText').textContent = `${version} is ready. Restart when you are done and Purrplexity will install it. Closing the app later installs it too.`;
  }
  $('#installUpdate').disabled = queryBusy();
  notice.hidden = false;
}
$('#installUpdate').onclick = async () => {
  const button = $('#installUpdate');
  if (button.disabled) return;
  button.disabled = true;
  try {
    await window.purrplexity.installUpdate();
    if (!queryBusy()) {
      button.disabled = false;
      $('#updateNoticeText').textContent = 'If Purrplexity is still open, quit and reopen it to finish installing the update.';
    }
  } catch (error) {
    pendingUpdate = { state: 'error', version: pendingUpdate?.version || '', message: formatBridgeError(error, 'Could not install the update.') };
    showUpdateNotice();
  }
};
if (window.purrplexity?.onUpdateStatus) window.purrplexity.onUpdateStatus(status => { pendingUpdate = status; showUpdateNotice(); });
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; } drawFiles();
if (window.purrplexity) window.purrplexity.getSetupStatus().then(setup => { if (!setup.connected) setTimeout(showSetup, 250); }).catch(() => setTimeout(showSetup, 250));
else if (runningInDesktopApp()) setTimeout(showSetup, 250);

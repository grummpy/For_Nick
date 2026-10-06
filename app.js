const GUMBUS_URL = 'https://chatgpt.com/g/g-6a3b127bd4c88191a2c0f8f3673bb106-gumbus';
const $ = selector => document.querySelector(selector);
const avatar = $('#avatar');
const status = $('#status');
const query = $('#query');
let files = [];
let confirmedWarning = '';

const states = {
  idle: ['assets/avatar/idle.png', 'Local draft ready'],
  listening: ['assets/avatar/listening.png', 'Drafting locally'],
  success: ['assets/avatar/success.png', 'Your draft is still on this device']
};

function setState(name) {
  [avatar.src, status.textContent] = states[name];
  avatar.classList.remove('pulse');
}

function addMessage(kind, heading, detail) {
  const article = document.createElement('article');
  article.className = 'message ' + kind;
  const label = document.createElement('small');
  label.textContent = heading;
  const text = document.createElement('div');
  text.textContent = detail;
  article.append(label, text);
  $('#conversation').append(article);
  $('#conversation').scrollTop = $('#conversation').scrollHeight;
}

function drawFiles() {
  const fileList = $('#fileList');
  fileList.replaceChildren();
  if (!files.length) {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = 'No local attachments listed yet.';
    fileList.append(hint);
  } else {
    files.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = 'file';
      const symbol = document.createElement('span');
      symbol.textContent = '⌁';
      const name = document.createElement('span');
      name.textContent = file.name;
      const size = document.createElement('small');
      size.textContent = String(Math.ceil(file.size / 1024)) + ' KB · not uploaded or read';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'file-remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        files = files.filter((_, itemIndex) => itemIndex !== index);
        drawFiles();
      });
      row.append(symbol, name, size, remove);
      fileList.append(row);
    });
  }
  $('#pendingFiles').textContent = files.length
    ? String(files.length) + ' local file' + (files.length === 1 ? '' : 's') + ' listed — never uploaded or read by this app.'
    : '';
}

function addFiles(list) {
  files = files.concat(Array.from(list));
  drawFiles();
}

function privacyFindings(text) {
  const findings = [];
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) findings.push('an email address');
  if (/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/.test(text)) findings.push('a phone number');
  if (/\b(?:student|school|record)\s*(?:id|number)\s*[:#-]?\s*[A-Z0-9-]{4,}\b/i.test(text)) findings.push('a labeled student or record identifier');
  if (/\b(?:student|child|learner|client)\s+name\s*:\s*\S+/i.test(text)) findings.push('a labeled name');
  return findings;
}

function needsPrivacyReview(text, action) {
  const findings = privacyFindings(text);
  if (!findings.length) {
    confirmedWarning = '';
    $('#privacyNotice').textContent = '';
    return false;
  }
  const key = action + ':' + text;
  if (confirmedWarning === key) return false;
  confirmedWarning = key;
  const actionLabel = action === 'copy' ? 'Copy draft' : 'Open GUMBUS';
  $('#privacyNotice').textContent = 'Local privacy check found ' + findings.join(', ') + '. Review or remove it; choose ' + actionLabel + ' again only if you intend to continue. Pattern checks cannot certify privacy or legal compliance.';
  return true;
}

async function copyDraft() {
  const text = query.value.trim();
  if (!text) {
    addMessage('error', 'NOT COPIED', 'Write a draft before copying it.');
    return;
  }
  if (needsPrivacyReview(text, 'copy')) return;
  try {
    await navigator.clipboard.writeText(text);
    setState('success');
    addMessage('answer', 'COPIED LOCALLY', 'The draft remains here until you explicitly clear it. Paste it only where you choose.');
  } catch {
    addMessage('error', 'COPY NOT AVAILABLE', 'Your draft was kept. Select and copy it manually, then try again if clipboard access becomes available.');
  }
}

function openGumbus(event) {
  event.preventDefault();
  const text = query.value.trim();
  if (text && needsPrivacyReview(text, 'open')) return;
  window.open(GUMBUS_URL, '_blank', 'noopener,noreferrer');
  setState('success');
  addMessage('answer', 'BROWSER OPENED', 'GUMBUS opened without sending your draft or listed files. Paste only the material you choose.');
}

document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(candidate => candidate.classList.toggle('active', candidate === button));
    $('#companion').hidden = button.dataset.view !== 'companion';
    $('#files').hidden = button.dataset.view !== 'files';
  });
});
$('#addFiles').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', event => {
  addFiles(event.target.files);
  event.target.value = '';
});
$('#clearFiles').addEventListener('click', () => {
  files = [];
  drawFiles();
});
query.addEventListener('input', () => {
  confirmedWarning = '';
  $('#privacyNotice').textContent = '';
  setState(query.value.trim() ? 'listening' : 'idle');
});
query.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    copyDraft();
  }
});
$('#dropzone').addEventListener('dragover', event => {
  event.preventDefault();
  $('#dropzone').classList.add('over');
});
$('#dropzone').addEventListener('dragleave', () => $('#dropzone').classList.remove('over'));
$('#dropzone').addEventListener('drop', event => {
  event.preventDefault();
  $('#dropzone').classList.remove('over');
  addFiles(event.dataTransfer.files);
});
$('#queryForm').addEventListener('submit', event => {
  event.preventDefault();
  copyDraft();
});
$('#openGumbus').addEventListener('click', openGumbus);
$('#clearDraft').addEventListener('click', () => {
  query.value = '';
  confirmedWarning = '';
  $('#privacyNotice').textContent = '';
  setState('idle');
  query.focus();
});
$('#setup').addEventListener('click', () => $('#guide').showModal());
$('#closeGuide').addEventListener('click', () => $('#guide').close());
drawFiles();

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { inspectSubmission } from './ferpa-guard.js';

const root = process.cwd();
try {
  const env = await readFile(join(root, '.env'), 'utf8');
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* .env is optional: demo mode remains available */ }
const port = Number(process.env.PORT || 3000);
const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };

function textFromResponse(response) {
  return response.output?.flatMap(item => item.content || []).filter(part => part.type === 'output_text').map(part => part.text).join('') || response.output_text || 'I received the query, but did not get a text response.';
}

async function askOpenAI({ query, files = [] }) {
  if (!process.env.OPENAI_API_KEY) {
    return `Demo mode — add OPENAI_API_KEY to .env, then restart. Your question was: “${query}”${files.length ? `\n\nAttached locally: ${files.map(file => file.name).join(', ')}.` : ''}`;
  }
  const tools = process.env.OPENAI_VECTOR_STORE_ID ? [{ type: 'file_search', vector_store_ids: [process.env.OPENAI_VECTOR_STORE_ID] }] : [];
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-5-mini', input: query, tools })
  });
  if (!response.ok) throw new Error(`OpenAI returned ${response.status}: ${await response.text()}`);
  return textFromResponse(await response.json());
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/query') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        if (typeof body.query !== 'string' || !body.query.trim()) throw new Error('Please enter a question.');
        const inspection = inspectSubmission(body);
        if (inspection.blocked) {
          console.info(`FERPA block: ${inspection.findings.map(finding => `${finding.type} x${finding.count}`).join(', ')}`);
          res.writeHead(422, { 'Content-Type': 'application/json' }).end(JSON.stringify({
            blocked: true,
            title: inspection.title,
            reason: inspection.reason,
            findings: inspection.findings
          }));
          return;
        }
        const answer = await askOpenAI(body);
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ answer, demo: !process.env.OPENAI_API_KEY }));
      } catch (error) { res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message })); }
    });
    return;
  }
  const path = normalize(req.url === '/' ? 'index.html' : req.url).replace(/^[/\\]+/, '');
  if (path.startsWith('..')) return res.writeHead(403).end('Forbidden');
  try { const file = join(root, path); await stat(file); res.writeHead(200, { 'Content-Type': type[extname(file)] || 'application/octet-stream' }); createReadStream(file).pipe(res); }
  catch { res.writeHead(404).end('Not found'); }
});

export function startServer() {
  return new Promise((resolve, reject) => {
    if (server.listening) return resolve(port);
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      console.log(`Purrplexity is ready at http://localhost:${port}`);
      resolve(port);
    });
  });
}

export function stopServer() {
  return new Promise(resolve => server.close(() => resolve()));
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) startServer();

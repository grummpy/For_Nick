import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// In a packaged Electron app, process.cwd() is the folder where the shortcut was
// launched, not the app bundle. Resolve assets from this source file instead.
const root = process.env.PURRPLEXITY_APP_ROOT || dirname(fileURLToPath(import.meta.url));
const preferredPort = Number(process.env.PORT || 3000);
const type = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  // This loopback server only serves the handoff UI. It deliberately has no
  // query API route, credential loading, provider call, or file-upload path.
  const path = normalize(req.url === '/' ? 'index.html' : req.url).replace(/^[/\\]+/, '');
  if (path.startsWith('..')) return res.writeHead(403).end('Forbidden');
  try {
    const file = join(root, path);
    await stat(file);
    res.writeHead(200, { 'Content-Type': type[extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

export function startServer() {
  return new Promise((resolve, reject) => {
    if (server.listening) return resolve(server.address().port);
    const listen = port => {
      const onError = error => {
        server.off('error', onError);
        // A local web server can already be using 3000. Pick a private free port
        // rather than leaving the installed app with a blank window.
        if (error.code === 'EADDRINUSE' && port !== 0) return listen(0);
        reject(error);
      };
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', onError);
        const activePort = server.address().port;
        console.log('Purrplexity is ready at http://localhost:' + activePort);
        resolve(activePort);
      });
    };
    listen(preferredPort);
  });
}

export function stopServer() {
  return new Promise(resolve => server.close(() => resolve()));
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) startServer();

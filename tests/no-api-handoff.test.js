import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';

import { startServer, stopServer } from '../server.js';

let baseUrl;

before(async () => {
  baseUrl = 'http://127.0.0.1:' + await startServer();
});

after(async () => {
  await stopServer();
});

test('serves a local-only GUMBUS handoff with no query endpoint', async () => {
  const [index, script, legacyRoute] = await Promise.all([
    fetch(baseUrl + '/').then(response => response.text()),
    fetch(baseUrl + '/app.js').then(response => response.text()),
    fetch(baseUrl + '/api/query', { method: 'POST', body: '{}' }),
  ]);

  assert.match(index, /Open GUMBUS/);
  assert.match(index, /g-6a3b127bd4c88191a2c0f8f3673bb106-gumbus/);
  assert.doesNotMatch(index, /api\/query|OPENAI_API_KEY/);
  assert.match(index, /makes no Responses API call/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.match(script, /textContent = file\.name/);
  assert.doesNotMatch(script, /fetch\(/);
  assert.equal(legacyRoute.status, 404);
});

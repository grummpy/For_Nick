import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSettingsStore, LOCAL_KEY_FILE, SETTINGS_FILE } from './settings-store.js';

const SECRET = 'sk-test-windows-fallback-key';

function mockSafeStorage({ available = true, failEncrypt = false } = {}) {
  const calls = { encrypt: 0, decrypt: 0 };
  return {
    calls,
    isEncryptionAvailable: () => available,
    encryptString: value => {
      calls.encrypt += 1;
      if (failEncrypt) throw new Error('Error while encrypting the text');
      return Buffer.concat([Buffer.from('os:'), Buffer.from(value, 'utf8')]);
    },
    decryptString: buffer => {
      calls.decrypt += 1;
      const text = Buffer.from(buffer).toString('utf8');
      if (!text.startsWith('os:')) throw new Error('bad blob');
      return text.slice(3);
    }
  };
}

async function withStore(safeStorage, fn) {
  const dir = await mkdtemp(join(tmpdir(), 'purrplexity-settings-'));
  const previous = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_VECTOR_STORE_ID: process.env.OPENAI_VECTOR_STORE_ID,
    OPENAI_MODEL: process.env.OPENAI_MODEL
  };
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_VECTOR_STORE_ID;
  delete process.env.OPENAI_MODEL;
  try {
    await fn(createSettingsStore({ userDataPath: dir, safeStorage }), dir);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await rm(dir, { recursive: true, force: true });
  }
}

describe('settings store', { concurrency: false }, () => {
  test('keeps the Mac safeStorage path and still reads older files', async () => {
    const safeStorage = mockSafeStorage();
    await withStore(safeStorage, async (store, dir) => {
      const saved = await store.save({ apiKey: SECRET, vectorStoreId: 'vs_123', model: 'gpt-5-mini' });
      assert.equal(saved.protection, 'os');
      assert.equal(saved.connected, true);
      assert.equal(process.env.OPENAI_API_KEY, SECRET);
      const raw = await readFile(join(dir, SETTINGS_FILE), 'utf8');
      assert.equal(raw.includes(SECRET), false);
      assert.equal(JSON.parse(raw).keyProtection, 'os');
      assert.equal(safeStorage.calls.encrypt, 1);
      await assert.rejects(access(join(dir, LOCAL_KEY_FILE)));

      delete process.env.OPENAI_API_KEY;
      const legacy = JSON.parse(raw);
      delete legacy.keyProtection;
      await writeFile(join(dir, SETTINGS_FILE), JSON.stringify(legacy));
      const restarted = createSettingsStore({ userDataPath: dir, safeStorage });
      const status = await restarted.apply();
      assert.equal(process.env.OPENAI_API_KEY, SECRET);
      assert.equal(status.connected, true);
      assert.equal(status.protection, 'os');
      assert.equal(status.vectorStoreId, 'vs_123');
      assert.equal(status.model, 'gpt-5-mini');
    });
  });

  test('falls back to local encryption when OS encryption is unavailable', async () => {
    const safeStorage = mockSafeStorage({ available: false });
    await withStore(safeStorage, async (store, dir) => {
      const saved = await store.save({ apiKey: `  ${SECRET}  `, vectorStoreId: ' vs_9 ', model: '' });
      assert.equal(saved.protection, 'local');
      assert.equal(saved.model, 'gpt-5-mini');
      assert.equal(saved.vectorStoreId, 'vs_9');
      assert.equal(safeStorage.calls.encrypt, 0);
      const raw = await readFile(join(dir, SETTINGS_FILE), 'utf8');
      assert.equal(raw.includes(SECRET), false);
      assert.equal(JSON.parse(raw).keyProtection, 'local');
      const keyFile = await readFile(join(dir, LOCAL_KEY_FILE));
      assert.equal(keyFile.length, 32);

      delete process.env.OPENAI_API_KEY;
      const status = await createSettingsStore({ userDataPath: dir, safeStorage }).apply();
      assert.equal(process.env.OPENAI_API_KEY, SECRET);
      assert.equal(status.protection, 'local');
      assert.equal(status.connected, true);
    });
  });

  test('falls back when safeStorage encryption throws', async () => {
    const safeStorage = mockSafeStorage({ failEncrypt: true });
    await withStore(safeStorage, async (store, dir) => {
      const saved = await store.save({ apiKey: SECRET });
      assert.equal(saved.protection, 'local');
      assert.equal(safeStorage.calls.encrypt, 1);
      delete process.env.OPENAI_API_KEY;
      const status = await createSettingsStore({ userDataPath: dir, safeStorage }).apply();
      assert.equal(process.env.OPENAI_API_KEY, SECRET);
      assert.equal(status.protection, 'local');
    });
  });

  test('uses safeStorage again after a local save once OS encryption works', async () => {
    await withStore(mockSafeStorage({ available: false }), async (store, dir) => {
      await store.save({ apiKey: SECRET });
      delete process.env.OPENAI_API_KEY;
      const osStore = createSettingsStore({ userDataPath: dir, safeStorage: mockSafeStorage() });
      const saved = await osStore.save({ apiKey: SECRET, vectorStoreId: 'vs_next' });
      assert.equal(saved.protection, 'os');
      const raw = JSON.parse(await readFile(join(dir, SETTINGS_FILE), 'utf8'));
      assert.equal(raw.keyProtection, 'os');
      assert.equal(raw.apiKey.includes(SECRET), false);
    });
  });

  test('does not throw when a saved key cannot be decrypted', async () => {
    const safeStorage = mockSafeStorage({ available: false });
    await withStore(safeStorage, async (_store, dir) => {
      await writeFile(join(dir, SETTINGS_FILE), JSON.stringify({ apiKey: Buffer.from('os:leftover').toString('base64'), vectorStoreId: 'vs_keep', model: 'gpt-5-mini' }));
      const status = await createSettingsStore({ userDataPath: dir, safeStorage }).apply();
      assert.equal(status.connected, false);
      assert.equal(status.protection, 'none');
      assert.equal(process.env.OPENAI_API_KEY, undefined);
      assert.equal(status.vectorStoreId, 'vs_keep');

      await writeFile(join(dir, SETTINGS_FILE), JSON.stringify({ apiKey: 'not-a-real-blob', keyProtection: 'local' }));
      const broken = await createSettingsStore({ userDataPath: dir, safeStorage: mockSafeStorage() }).apply();
      assert.equal(broken.connected, false);
      assert.equal(broken.protection, 'none');
    });
  });

  test('rejects an empty key before writing settings', async () => {
    await withStore(mockSafeStorage(), async (store, dir) => {
      await assert.rejects(store.save({ apiKey: '   ' }), /Paste an OpenAI API key/);
      await assert.rejects(access(join(dir, SETTINGS_FILE)));
    });
  });
});

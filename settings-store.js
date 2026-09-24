import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const SETTINGS_FILE = 'purrplexity-settings.json';
export const LOCAL_KEY_FILE = 'purrplexity-local.key';

function osEncryptionAvailable(safeStorage) {
  try {
    return Boolean(safeStorage?.isEncryptionAvailable?.());
  } catch {
    return false;
  }
}

async function readLocalKey(userDataPath) {
  try {
    const key = await readFile(join(userDataPath, LOCAL_KEY_FILE));
    if (key.length === 32) return key;
  } catch { /* missing until a local fallback save */ }
  return null;
}

async function loadOrCreateLocalKey(userDataPath) {
  const existing = await readLocalKey(userDataPath);
  if (existing) return existing;
  const key = randomBytes(32);
  await mkdir(userDataPath, { recursive: true });
  await writeFile(join(userDataPath, LOCAL_KEY_FILE), key, { mode: 0o600 });
  return key;
}

function sealLocal(key, plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

function openLocal(key, payload) {
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < 29) throw new Error('Saved API key is incomplete.');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function createSettingsStore({ userDataPath, safeStorage }) {
  const file = join(userDataPath, SETTINGS_FILE);

  const read = async () => {
    try { return JSON.parse(await readFile(file, 'utf8')); } catch { return {}; }
  };

  const decryptApiKey = async saved => {
    if (!saved?.apiKey || typeof saved.apiKey !== 'string') return '';
    if (saved.keyProtection === 'local') {
      const key = await readLocalKey(userDataPath);
      if (!key) return '';
      return openLocal(key, saved.apiKey);
    }
    if (!osEncryptionAvailable(safeStorage)) return '';
    return safeStorage.decryptString(Buffer.from(saved.apiKey, 'base64'));
  };

  const apply = async () => {
    const saved = await read();
    let apiKey = '';
    try { apiKey = await decryptApiKey(saved); } catch { apiKey = ''; }
    if (apiKey) process.env.OPENAI_API_KEY = apiKey;
    if (saved.vectorStoreId) process.env.OPENAI_VECTOR_STORE_ID = saved.vectorStoreId;
    if (saved.model) process.env.OPENAI_MODEL = saved.model;
    const storedProtection = saved.keyProtection === 'local' ? 'local' : 'os';
    return {
      connected: Boolean(process.env.OPENAI_API_KEY),
      vectorStoreId: saved.vectorStoreId || '',
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      protection: apiKey ? storedProtection : 'none'
    };
  };

  const encryptApiKey = async apiKey => {
    if (osEncryptionAvailable(safeStorage)) {
      try {
        return { apiKey: safeStorage.encryptString(apiKey).toString('base64'), keyProtection: 'os' };
      } catch { /* Windows can report encryption as available and still refuse to encrypt. */ }
    }
    const key = await loadOrCreateLocalKey(userDataPath);
    return { apiKey: sealLocal(key, apiKey), keyProtection: 'local' };
  };

  const save = async ({ apiKey, vectorStoreId = '', model = 'gpt-5-mini' } = {}) => {
    const key = typeof apiKey === 'string' ? apiKey.trim() : '';
    if (!key) throw new Error('Paste an OpenAI API key to connect Purrplexity.');
    await mkdir(userDataPath, { recursive: true });
    const protectedKey = await encryptApiKey(key);
    const saved = {
      ...protectedKey,
      vectorStoreId: String(vectorStoreId || '').trim(),
      model: String(model || '').trim() || 'gpt-5-mini'
    };
    try {
      await writeFile(file, JSON.stringify(saved, null, 2), { encoding: 'utf8', mode: 0o600 });
    } catch (error) {
      throw new Error(`Could not save the API key on this computer. ${error.message}`);
    }
    process.env.OPENAI_API_KEY = key;
    process.env.OPENAI_VECTOR_STORE_ID = saved.vectorStoreId;
    process.env.OPENAI_MODEL = saved.model;
    return { connected: true, vectorStoreId: saved.vectorStoreId, model: saved.model, protection: saved.keyProtection };
  };

  return { apply, save };
}

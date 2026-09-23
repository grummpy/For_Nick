import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export function createSettingsStore({ userDataPath, safeStorage }) {
  const file = join(userDataPath, 'purrplexity-settings.json');
  const read = async () => { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return {}; } };
  const apply = async () => {
    const saved = await read();
    if (saved.apiKey && safeStorage.isEncryptionAvailable()) process.env.OPENAI_API_KEY = safeStorage.decryptString(Buffer.from(saved.apiKey, 'base64'));
    if (saved.vectorStoreId) process.env.OPENAI_VECTOR_STORE_ID = saved.vectorStoreId;
    if (saved.model) process.env.OPENAI_MODEL = saved.model;
    return { connected: Boolean(process.env.OPENAI_API_KEY), vectorStoreId: saved.vectorStoreId || '', model: process.env.OPENAI_MODEL || 'gpt-5-mini' };
  };
  const save = async ({ apiKey, vectorStoreId = '', model = 'gpt-5-mini' }) => {
    if (!apiKey?.trim()) throw new Error('Paste an OpenAI API key to connect Purrplexity.');
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is not available on this computer.');
    await mkdir(userDataPath, { recursive: true });
    const saved = { apiKey: safeStorage.encryptString(apiKey.trim()).toString('base64'), vectorStoreId: vectorStoreId.trim(), model: model.trim() || 'gpt-5-mini' };
    await writeFile(file, JSON.stringify(saved, null, 2), { encoding: 'utf8', mode: 0o600 });
    process.env.OPENAI_API_KEY = apiKey.trim(); process.env.OPENAI_VECTOR_STORE_ID = saved.vectorStoreId; process.env.OPENAI_MODEL = saved.model;
    return { connected: true, vectorStoreId: saved.vectorStoreId, model: saved.model };
  };
  return { apply, save };
}

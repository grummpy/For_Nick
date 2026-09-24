import { app, BrowserWindow, shell, ipcMain, safeStorage } from 'electron';
import electronUpdater from 'electron-updater';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, stopServer } from './server.js';
import { createSettingsStore } from './settings-store.js';
import { createUpdateController } from './update-controller.js';

const { autoUpdater } = electronUpdater;

const appRoot = dirname(fileURLToPath(import.meta.url));
let window;
let settings;
let latestUpdate = null;
const deliverUpdate = () => {
  if (!latestUpdate || !window || window.isDestroyed()) return;
  window.webContents.send('purrplexity:update-status', latestUpdate);
};
const updates = createUpdateController({
  autoUpdater,
  isPackaged: app.isPackaged,
  isPortable: process.platform === 'win32' && Boolean(process.env.PORTABLE_EXECUTABLE_FILE),
  sendStatus: status => { latestUpdate = status; deliverUpdate(); },
  log: message => console.error(message)
});
const createWindow = async () => {
  window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 600,
    title: 'Purrplexity',
    backgroundColor: '#050b16',
    autoHideMenuBar: true,
    icon: process.platform === 'win32' ? join(app.getAppPath(), 'build', 'icon.ico') : join(app.getAppPath(), 'build', 'icon.icns'),
    webPreferences: {
      // Sandboxed preloads must be CommonJS. ESM preload.js fails inside the packaged Windows app, so window.purrplexity never appears.
      preload: join(appRoot, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  window.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`Purrplexity could not load the setup bridge (${preloadPath}): ${error?.message || error}`);
  });
  window.webContents.on('did-finish-load', deliverUpdate);
  try {
    const port = await startServer();
    await window.loadURL(`http://127.0.0.1:${port}`);
  } catch (error) {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<main style="font-family:system-ui;background:#050b16;color:#eaf7ff;padding:40px"><h1>Purrplexity could not start</h1><p>${error.message}</p><p>Please reopen the app. If this keeps happening, send this message to support.</p></main>`)}`);
  }
  window.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
};

app.whenReady().then(async () => {
  settings = createSettingsStore({ userDataPath: app.getPath('userData'), safeStorage });
  await settings.apply();
  ipcMain.handle('purrplexity:get-setup-status', () => settings.apply());
  ipcMain.handle('purrplexity:save-setup', async (_event, input) => {
    try {
      return await settings.save(input || {});
    } catch (error) {
      throw new Error(error?.message || 'Could not save the API key on this computer.');
    }
  });
  ipcMain.handle('purrplexity:install-update', () => {
    try {
      updates.install();
    } catch (error) {
      throw new Error(error?.message || 'Could not install the update.');
    }
  });
  await createWindow();
  updates.start();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('before-quit', () => { updates.stop(); stopServer(); });

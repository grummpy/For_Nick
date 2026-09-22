import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { startServer, stopServer } from './server.js';

let window;
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
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  try {
    const port = await startServer();
    await window.loadURL(`http://127.0.0.1:${port}`);
  } catch (error) {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<main style="font-family:system-ui;background:#050b16;color:#eaf7ff;padding:40px"><h1>Purrplexity could not start</h1><p>${error.message}</p><p>Please reopen the app. If this keeps happening, send this message to support.</p></main>`)}`);
  }
  window.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
};

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('before-quit', () => stopServer());

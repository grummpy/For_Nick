import { app, BrowserWindow, shell } from 'electron';
import { startServer, stopServer } from './server.js';

let window;
const createWindow = async () => {
  const port = await startServer();
  window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 600,
    title: 'Purrplexity',
    backgroundColor: '#050b16',
    autoHideMenuBar: true,
    icon: process.platform === 'win32' ? 'build/icon.ico' : 'build/icon.icns',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  await window.loadURL(`http://127.0.0.1:${port}`);
  window.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
};

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('before-quit', () => stopServer());

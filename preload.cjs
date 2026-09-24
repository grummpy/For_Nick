const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('purrplexity', {
  getSetupStatus: () => ipcRenderer.invoke('purrplexity:get-setup-status'),
  saveSetup: settings => ipcRenderer.invoke('purrplexity:save-setup', settings),
  onUpdateStatus: callback => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('purrplexity:update-status', listener);
    return () => ipcRenderer.removeListener('purrplexity:update-status', listener);
  },
  installUpdate: () => ipcRenderer.invoke('purrplexity:install-update')
});

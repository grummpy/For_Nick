import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('purrplexity', {
  getSetupStatus: () => ipcRenderer.invoke('purrplexity:get-setup-status'),
  saveSetup: settings => ipcRenderer.invoke('purrplexity:save-setup', settings)
});

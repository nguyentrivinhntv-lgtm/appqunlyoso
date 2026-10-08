const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printToPDF: (options) => ipcRenderer.invoke('print-to-pdf', options),
  getLocalIPs: () => ipcRenderer.invoke('get-local-ips'),
  isElectron: true,
});

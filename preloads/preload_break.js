const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("electronAPI", {
    skipBreak: () => ipcRenderer.invoke("skipBreak"),
    endBreak: () => ipcRenderer.invoke("endBreak"),
    getSettings: () => ipcRenderer.invoke('getSettings'),
});

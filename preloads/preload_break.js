const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("electronAPI", {
    skipBreak: () => ipcRenderer.invoke("skipBreak"),
    endBreak: () => ipcRenderer.invoke("endBreak"),
    getSettings: () => {
        return ipcRenderer.invoke("getSettings").then(settings => {
            const breakType = process.argv.includes("--breakType=short") ? "short" : "long";
            return { ...settings, breakType };
        });
    }
});

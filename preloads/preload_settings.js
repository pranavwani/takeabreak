const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    updateSettings: (
        shortInterval,
        longInterval,
        shortDuration,
        longDuration,
        strictMode
    ) =>{
        ipcRenderer.invoke(
            'updateSettings',
            shortInterval,
            longInterval,
            shortDuration,
            longDuration,
            strictMode
        )
    },
    getSettings: () => {
        return ipcRenderer.invoke("getSettings").then(settings => {
            const breakType = process.argv.includes("--breakType=short") ? "short" : "long";
            return { ...settings, breakType };
        });
    }
});

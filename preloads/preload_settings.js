const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    updateSettings: (
        shortInterval,
        longInterval,
        shortDuration,
        longDuration,
        strictMode
    ) =>{
        console.log('called');
        
        ipcRenderer.invoke(
            'updateSettings',
            shortInterval,
            longInterval,
            shortDuration,
            longDuration,
            strictMode
        )
    },
    getSettings: () => ipcRenderer.invoke('getSettings'),
});

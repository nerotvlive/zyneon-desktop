const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    updateTitleBar: (config) => ipcRenderer.send('update-titlebar-color', config),
    modrinthSearchProjects: (payload) => ipcRenderer.invoke('modrinth-search-projects', payload)
});
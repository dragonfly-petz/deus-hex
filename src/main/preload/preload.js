const { contextBridge, ipcRenderer } = require('electron');

const validChannels = ['mainIpcChannel'];

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on(channel, func) {
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, func);
      }
    },
    send(channel, ...args) {
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.send(channel, ...args);
      }
    },
  },
});

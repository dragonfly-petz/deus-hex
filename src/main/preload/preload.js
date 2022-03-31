const { contextBridge, ipcRenderer } = require('electron');

const validChannels = ['mainIpcChannel', 'domIpcChannel'];

const windowParamKeys = ['editorTarget'];
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const windowParams = {};
for (const key of windowParamKeys) {
  windowParams[key] = urlParams.get(key);
}

contextBridge.exposeInMainWorld('electron', {
  windowParams,
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

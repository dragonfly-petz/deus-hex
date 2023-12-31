// eslint-disable-next-line global-require,@typescript-eslint/no-var-requires
const { contextBridge, ipcRenderer } = require('electron');

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const windowParams = {};
urlParams.forEach((val, key) => {
  windowParams[key] = val;
});
const validChannels = [
  'mainIpcChannel',
  `domIpcChannel_${windowParams.windowId}`,
];
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
        ipcRenderer.send(channel, ...args);
      }
    },
  },
});

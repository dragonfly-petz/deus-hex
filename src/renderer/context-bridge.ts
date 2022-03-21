import { IpcTransport } from '../common/ipc';

export function getContextBridgeIpcRenderer() {
  // @ts-ignore
  return window.electron.ipcRenderer as IpcTransport;
}

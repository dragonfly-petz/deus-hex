import { IpcTransportRenderer } from '../common/ipc';
import type { WindowParams } from '../main/app/create-window';

export function getContextBridgeIpcRenderer() {
  // @ts-ignore
  return window.electron.ipcRenderer as IpcTransportRenderer;
}

export function getContextBridgeWindowParams() {
  // @ts-ignore
  return window.electron.windowParams as WindowParams;
}

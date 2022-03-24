import { app } from 'electron';
import { createWindow } from './create-window';
import { mkAndConnectMainIpc } from './main-ipc';

export async function init() {
  app.on('window-all-closed', () => {
    app.quit();
  });
  mkAndConnectMainIpc();
  return createWindow();
}

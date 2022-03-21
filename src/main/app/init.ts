import { app } from 'electron';
import { createWindow } from './create-window';
import { connectIpc, MainIpc } from './main-ipc';

export async function init() {
  app.on('window-all-closed', () => {
    app.quit();
  });
  const mainIpc = new MainIpc();
  connectIpc(mainIpc);
  await app.whenReady();
  await createWindow();
}

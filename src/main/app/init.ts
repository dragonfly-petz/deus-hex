import { app } from 'electron';
import { createWindow } from './create-window';
import { mkAndConnectMainIpc } from './main-ipc';
import { PersistedStore } from './persisted/persisted-store';
import { persistedStateMigration } from './persisted/user-settings';

export async function init() {
  const userSettingsStore = new PersistedStore(
    'userSettings',
    persistedStateMigration
  );
  const userSettings = await userSettingsStore.load();

  app.on('window-all-closed', () => {
    app.quit();
  });
  mkAndConnectMainIpc();
  return createWindow();
}

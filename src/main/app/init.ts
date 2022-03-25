import { app } from 'electron';
import { createWindow } from './create-window';
import { mkAndConnectMainIpc } from './main-ipc';
import { PersistedStore } from './persisted/persisted-store';
import { persistedStateMigration } from './persisted/user-settings';
import { RemoteObject } from '../../common/reactive/remote-object';

export async function init() {
  const userSettingsStore = new PersistedStore(
    'userSettings',
    persistedStateMigration
  );
  const userSettings = await userSettingsStore.load();
  const userSettingsRemote = new RemoteObject(
    userSettings,
    (it) => userSettingsStore.save(it),
    userSettingsStore.listenable
  );

  app.on('window-all-closed', () => {
    app.quit();
  });
  mkAndConnectMainIpc(userSettingsRemote);
  const res = await createWindow();
  userSettingsRemote.listenable.listen((it) => {
    res.domIpc.updateUserSettings(it);
  });
  return res;
}

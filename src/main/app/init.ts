import { app } from 'electron';
import { createWindow, DomIpcHolder } from './create-window';
import { mkAndConnectMainIpc } from './main-ipc';
import { PersistedStore } from './persisted/persisted-store';
import { userSettingsMigration } from './persisted/user-settings';
import { RemoteObject } from '../../common/reactive/remote-object';
import { isDev } from './util';

const debugEditorFile =
  'C:\\Users\\franc\\Documents\\Petz\\Petz 4\\Resource\\Catz\\Calico.cat';
const debugParams = isDev()
  ? {
      editorTarget: debugEditorFile,
    }
  : undefined;

export async function init(domIpcHolder: DomIpcHolder) {
  const userSettingsStore = new PersistedStore(
    'userSettings',
    userSettingsMigration
  );
  const userSettings = await userSettingsStore.load();
  const userSettingsRemote = new RemoteObject(
    userSettings,
    (it) => userSettingsStore.save(it),
    userSettingsStore.listenable
  );

  app.on('window-all-closed', () => {
    userSettingsRemote.dispose();
    app.quit();
  });
  mkAndConnectMainIpc(userSettingsRemote, domIpcHolder);

  await createWindow(domIpcHolder, userSettingsRemote, debugParams);
}

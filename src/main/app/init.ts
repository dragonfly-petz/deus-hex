import { app } from 'electron';
import {
  createWindow,
  CreateWindowParams,
  DomIpcHolder,
} from './create-window';
import { mkAndConnectMainIpc } from './main-ipc';
import { PersistedStore } from './persisted/persisted-store';
import { userSettingsMigration } from './persisted/user-settings';
import { RemoteObject } from '../../common/reactive/remote-object';
import { isDev } from './util';
import { globalLogger } from '../../common/logger';
import { isNotNully, isNully } from '../../common/null';

const _debugEditorFile =
  'C:\\Users\\franc\\Documents\\Petz\\Petz 4\\Resource\\Catz\\Calico.cat';
const debugProjectFile =
  'C:\\Users\\franc\\AppData\\Roaming\\Electron\\Deus Hex Projects\\Catz Projects\\Foo\\Current Version\\Orange Shorthair.cat';
const debugParams = isDev()
  ? {
      editorTarget: debugProjectFile,
    }
  : null;

function argVToWindowParams(argV: string[]): CreateWindowParams | null {
  const args = app.isPackaged ? argV : argV.slice(7);
  if (isNotNully(args[1])) {
    return { editorTarget: args[1] };
  }
  return null;
}

interface AdditionalData {
  argv: string[];
}

export async function init(domIpcHolder: DomIpcHolder) {
  let createWindowWithParams: (
    params: CreateWindowParams | null
  ) => Promise<void> = () => {
    throw new Error('Invoked create window before it was set');
  };
  app.on('second-instance', (_event, _argv, _workingDir, additionalData) => {
    const additional = additionalData as AdditionalData;
    globalLogger.info(
      `On second instance: additional data: ${JSON.stringify(additional)}`
    );
    const params = argVToWindowParams(additional.argv);
    if (isNully(params)) return;
    createWindowWithParams(params);
  });
  const originalArgV: AdditionalData = { argv: process.argv };
  if (!app.requestSingleInstanceLock(originalArgV)) {
    globalLogger.info('Second instance requested, quitting this new instance');
    app.quit();
    return;
  }

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
    app.releaseSingleInstanceLock();
    app.quit();
  });
  const mainIpc = mkAndConnectMainIpc(userSettingsRemote, domIpcHolder);

  createWindowWithParams = async (params: CreateWindowParams | null) => {
    return createWindow(domIpcHolder, userSettingsRemote, mainIpc, params);
  };
  await createWindowWithParams(argVToWindowParams(process.argv) ?? debugParams);
}

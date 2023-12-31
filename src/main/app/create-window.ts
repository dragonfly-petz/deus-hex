import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { getAssetPath, getPreloadPath, resolveHtmlPath } from './asset-path';
import MenuBuilder from './menu';
import { checkForUpdates } from './updater';
import { isDev } from './util';
import { globalLogger, Logger, LogLevel } from '../../common/logger';
import { isNotNully } from '../../common/null';
import { domIpcChannel, IpcHandler } from '../../common/ipc';
import type { DomIpc, DomIpcBase } from '../../renderer/dom-ipc';
import type { FlashMessageProps } from '../../renderer/framework/FlashMessage';
import { RemoteObject } from '../../common/reactive/remote-object';
import { UserSettings } from './persisted/user-settings';
import type { MainIpcBase } from './main-ipc';
import Input = Electron.Input;

export interface CreateWindowParams {
  editorTarget?: string;
}

export interface WindowParams {
  windowId: string;
  editorTarget?: string;
}

function toParams(obj: object) {
  const entries = Object.entries(obj);
  return entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

export class DomIpcHolder {
  private domIpcs = new Map<number, DomIpc>();

  getDomIpc(id: number) {
    return this.domIpcs.get(id) ?? null;
  }

  addDomIpc(id: number, ipc: DomIpc) {
    this.domIpcs.set(id, ipc);
    return () => {
      this.domIpcs.delete(id);
    };
  }

  async addUncaughtError(title: string, err: string) {
    if (this.domIpcs.size > 0) {
      for (const ipc of this.domIpcs.values()) {
        ipc.addUncaughtError(title, err);
      }
    } else {
      dialog.showErrorBox('Uncaught error in main', err);
    }
  }

  async addCaughtError(title: string, err: string) {
    if (this.domIpcs.size > 0) {
      for (const ipc of this.domIpcs.values()) {
        ipc.addCaughtError(title, err);
      }
    } else {
      dialog.showErrorBox(title, err);
    }
  }

  async addFlashMessage(fm: FlashMessageProps) {
    if (this.domIpcs.size > 0) {
      for (const ipc of this.domIpcs.values()) {
        ipc.addFlashMessage(fm);
      }
    } else {
      dialog.showErrorBox(fm.title, fm.message);
    }
  }
}

const installExtensions = async () => {
  // eslint-disable-next-line global-require,@typescript-eslint/no-var-requires
  const installer = require('electron-devtools-installer');
  const forceDownload = Boolean(process.env.UPGRADE_EXTENSIONS);
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(globalLogger.error);
};

let lastWindowId = 0;

export async function createWindow(
  domIpcHolder: DomIpcHolder,
  userSettingsRemote: RemoteObject<UserSettings>,
  mainIpc: MainIpcBase,
  params: CreateWindowParams | null
) {
  if (isDev()) {
    await installExtensions();
  }
  const windowId = lastWindowId;
  lastWindowId++;
  const window = new BrowserWindow({
    show: false,
    width: 1920,
    height: 1080,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: getPreloadPath(),
    },
  });
  window.webContents.on(
    'console-message',
    (_e, level, message, line, sourceId) => {
      globalLogger.info(
        `FromBrowser: ${level}\n${message}\n(${sourceId}:${line}`
      );
    }
  );
  const path = resolveHtmlPath('index.html');
  const finalParams: WindowParams = {
    ...params,
    windowId: windowId.toString(10),
  };
  const finalPath = `${path}?${toParams(finalParams)}`;
  globalLogger.info(`Opening window ${windowId} with path ${finalPath}`);
  // noinspection ES6MissingAwait
  window.loadURL(finalPath);

  window.on('ready-to-show', () => {
    window.show();
    if (!isDev()) {
      window.maximize();
    }
  });

  const menuBuilder = new MenuBuilder(window);
  menuBuilder.buildMenu();

  // for now we are hiding the menu permanently because it interferes with alt and we don't have much use for it
  window.removeMenu();

  window.webContents.on('before-input-event', (event: Event, input: Input) => {
    console.dir(event);
    console.dir(input);
    if (input.key === 'F11') {
      window.setFullScreen(window.isFullScreen());
      event.preventDefault();
    } else if (input.key === 'F12') {
      window.webContents.openDevTools();
      event.preventDefault();
    }
  });

  // Open urls in the user's browser
  window.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
  addDomLogHandler(`domWindow<${windowId}>`, window);
  checkForUpdates();

  return new Promise<void>((resolve) => {
    window.webContents.once('did-finish-load', async () => {
      const domIpc = new IpcHandler<DomIpcBase>(
        `${domIpcChannel}_${windowId}`,
        {
          tag: 'mainToDom',
          on: ipcMain.on.bind(ipcMain),
          send: window.webContents.send.bind(window.webContents),
        }
      ).target;
      const holderDisposer = domIpcHolder.addDomIpc(windowId, domIpc);
      const userSettingsDisposer = userSettingsRemote.listen((it) => {
        domIpc.updateUserSettings(it);
      }, false);
      window.on('close', () => {
        mainIpc.unregisterWindow(windowId);
        holderDisposer();
        userSettingsDisposer();
      });

      resolve();
    });
  });
}

const electronLevelToLogLevel: Partial<Record<number, LogLevel>> = {
  1: 'info',
  2: 'warn',
  3: 'error',
};

export function addDomLogHandler(name: string, renderer: BrowserWindow) {
  const domLogger = new Logger(`mainProxy<${name}>`);
  renderer.webContents.on('console-message', (_ev, numericLevel, message) => {
    const logLevel = electronLevelToLogLevel[numericLevel];
    const level = isNotNully(logLevel) ? logLevel : 'info';
    domLogger[level](message);
  });
}

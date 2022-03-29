import { BrowserWindow, ipcMain, shell } from 'electron';
import { getAssetPath, getPreloadPath, resolveHtmlPath } from './asset-path';
import MenuBuilder from './menu';
import { checkForUpdates } from './updater';
import { isDev } from './util';
import { globalLogger, Logger, LogLevel } from '../../common/logger';
import { isNotNully } from '../../common/null';
import { domIpcChannel, IpcHandler } from '../../common/ipc';
import { DomIpc, DomIpcBase } from '../../renderer/dom-ipc';

const installExtensions = async () => {
  // eslint-disable-next-line global-require
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

export interface AppWindow {
  window: BrowserWindow;
  domIpc: DomIpc;
}

export async function createWindow() {
  if (isDev()) {
    await installExtensions();
  }

  const window = new BrowserWindow({
    show: false,
    width: 1920,
    height: 1080,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: getPreloadPath(),
    },
  });

  // noinspection ES6MissingAwait
  window.loadURL(resolveHtmlPath('index.html'));

  window.on('ready-to-show', () => {
    window.show();
    if (!isDev()) {
      window.maximize();
    }
  });

  const menuBuilder = new MenuBuilder(window);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  window.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });
  addDomLogHandler('mainDom', window);
  checkForUpdates();

  return new Promise<AppWindow>((resolve) => {
    window.webContents.once('did-finish-load', async () => {
      const domIpc = new IpcHandler<DomIpcBase>(domIpcChannel, {
        tag: 'mainToDom',
        on: ipcMain.on.bind(ipcMain),
        send: window.webContents.send.bind(window.webContents),
      });
      resolve({ window, domIpc: domIpc.target });
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

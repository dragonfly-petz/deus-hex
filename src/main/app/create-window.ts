import { BrowserWindow, shell } from 'electron';
import { getAssetPath, getPreloadPath, resolveHtmlPath } from './asset-path';
import MenuBuilder from './menu';
import { checkForUpdates } from './updater';
import { isDev } from './util';
import { globalLogger } from '../../common/logger';

const installExtensions = async () => {
  // eslint-disable-next-line global-require
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(globalLogger.error);
};

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
    if (!window) {
      throw new Error('"window" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      window.minimize();
    } else {
      window.show();
      if (!isDev()) {
        window.maximize();
      }
    }
  });

  const menuBuilder = new MenuBuilder(window);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  window.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  checkForUpdates();
}

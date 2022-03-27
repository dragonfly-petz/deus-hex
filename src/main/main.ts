import { app, dialog } from 'electron';
import { isDev } from './app/util';
import { init } from './app/init';
import { initElectronLogger } from './app/main-logger';
import { globalLogger, initGlobalLogger } from '../common/logger';
import { initGlobalErrorReporter } from '../common/error';
import { DomIpc } from '../renderer/dom-ipc';
import { isNully } from '../common/null';
import { throwRejectionK } from '../common/promise';

let domIpc: DomIpc | null;

initGlobalErrorReporter(
  (err) => {
    globalLogger.info('Uncaught main Error Handler: ');
    globalLogger.error(err.toStringMessage());
    if (isNully(domIpc)) {
      dialog.showErrorBox('Uncaught error in main', err.toStringMessage());
    } else {
      // noinspection JSIgnoredPromiseFromCall
      domIpc.addUncaughtError('Uncaught error in main', err.toStringMessage());
    }
  },
  (err) => {
    globalLogger.info('Caught main Error Handler: ');
    globalLogger.warn(err);
    if (isNully(domIpc)) {
      dialog.showErrorBox('Caught error in main', err);
    } else {
      // noinspection JSIgnoredPromiseFromCall
      domIpc.addCaughtError('Caught error in main', err);
    }
  },
  (fm) => {
    if (isNully(domIpc)) {
      dialog.showErrorBox(fm.title, fm.message);
    } else {
      // noinspection JSIgnoredPromiseFromCall
      domIpc.addFlashMessage(fm);
    }
  }
);

initGlobalLogger('main');

initElectronLogger();

if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line global-require
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (isDev()) {
  // eslint-disable-next-line global-require
  require('electron-debug')();
}

throwRejectionK(async () => {
  globalLogger.info(
    `\n\n*** Starting Deus Hex ***\n    version: ${app.getVersion()}\n\n`
  );
  await app.whenReady();
  const res = await init();
  domIpc = res.domIpc;
});

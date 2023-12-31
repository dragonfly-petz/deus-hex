import { app } from 'electron';
import { isDev } from './app/util';
import { init } from './app/init';
import { initElectronLogger } from './app/main-logger';
import { globalLogger, initGlobalLogger } from '../common/logger';
import { initGlobalErrorReporter } from '../common/error';
import { throwRejectionK } from '../common/promise';
import { DomIpcHolder } from './app/create-window';

const domIpcHolder = new DomIpcHolder();

initGlobalErrorReporter(
  (err) => {
    globalLogger.info('Uncaught main Error Handler: ');
    globalLogger.error(err.toStringMessage());
    // noinspection JSIgnoredPromiseFromCall
    domIpcHolder.addUncaughtError(
      'Uncaught error in main',
      err.toStringMessage()
    );
  },
  (err) => {
    globalLogger.info('Caught main Error Handler: ');
    globalLogger.warn(err);
    // noinspection JSIgnoredPromiseFromCall
    domIpcHolder.addCaughtError('Caught error in main', err);
  },
  (fm) => {
    // noinspection JSIgnoredPromiseFromCall
    domIpcHolder.addFlashMessage(fm);
  }
);

initGlobalLogger('main');

initElectronLogger();

if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line global-require,@typescript-eslint/no-var-requires
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (isDev()) {
  // eslint-disable-next-line global-require,@typescript-eslint/no-var-requires
  require('electron-debug')();
}

throwRejectionK(async () => {
  globalLogger.info(
    `\n\n*** Starting Deus Hex ***\n    version: ${app.getVersion()}\n\n`
  );
  await app.whenReady();
  await init(domIpcHolder);
});

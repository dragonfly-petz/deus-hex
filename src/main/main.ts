import { dialog } from 'electron';
import { isDev } from './app/util';
import { init } from './app/init';
import { initElectronLogger } from './app/main-logger';
import { globalLogger } from '../common/logger';
import { installErrorHandler } from '../common/error';

installErrorHandler((err) => {
  if (isDev()) {
    globalLogger.error(err.toStringMessage());
  } else {
    globalLogger.error(err.toStringMessage());
    dialog.showErrorBox('Error in main', err.toStringMessage());
  }
});
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
init().catch(globalLogger.error);

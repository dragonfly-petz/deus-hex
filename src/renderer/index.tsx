import { render } from 'react-dom';
import App from './App';
import { initGlobalErrorReporter } from '../common/error';
import { globalLogger, initGlobalLogger } from '../common/logger';
import './reset.global.scss';
import './app.global.scss';
import { mkAndConnectDomIpc } from './dom-ipc';
import { mkAppReactiveNodes } from './context/app-reactive-nodes';

initGlobalLogger('dom');
const appReactiveNodes = mkAppReactiveNodes();
const domIpc = mkAndConnectDomIpc({
  flashMessages: appReactiveNodes.flashMessages,
});
initGlobalErrorReporter(
  (err) => {
    globalLogger.info('Uncaught DOM Error Handler: ');
    globalLogger.error(err.toStringMessage());
    // noinspection JSIgnoredPromiseFromCall
    domIpc.addUncaughtError('Uncaught DOM error', err.toStringMessage());
  },
  (err) => {
    globalLogger.info('Caught DOM Error Handler: ');
    globalLogger.warn(err);
    // noinspection JSIgnoredPromiseFromCall
    domIpc.addCaughtError('Caught DOM error', err);
  }
);

render(
  <App domIpc={domIpc} appReactiveNodes={appReactiveNodes} />,
  document.getElementById('root')
);

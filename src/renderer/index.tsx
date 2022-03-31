import { render } from 'react-dom';
import App from './App';
import { initGlobalErrorReporter } from '../common/error';
import { globalLogger, initGlobalLogger } from '../common/logger';
import './style/reset.global.scss';
import './style/app.global.scss';
import { mkAndConnectDomIpc } from './dom-ipc';
import { mkStaticReactiveNodes } from './context/app-reactive-nodes';
import 'tippy.js/dist/tippy.css';

initGlobalLogger('dom');
const appReactiveNodes = mkStaticReactiveNodes();
const domIpc = mkAndConnectDomIpc({
  flashMessagesNode: appReactiveNodes.flashMessagesNode,
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
  },
  (fm) => {
    // noinspection JSIgnoredPromiseFromCall
    domIpc.addFlashMessage(fm);
  }
);

render(
  <App domIpc={domIpc} appReactiveNodes={appReactiveNodes} />,
  document.getElementById('root')
);

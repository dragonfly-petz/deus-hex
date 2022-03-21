import { render } from 'react-dom';
import App from './App';
import { installErrorHandler } from '../common/error';
import { globalLogger } from '../common/logger';
import './reset.global.scss';
import './app.global.scss';

installErrorHandler((err) => {
  globalLogger.error(err.toStringMessage());
  // eslint-disable-next-line no-alert
  window.alert(`Error in DOM: ${err.toStringMessage()}`);
});

render(<App />, document.getElementById('root'));

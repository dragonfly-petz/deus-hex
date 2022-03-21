import { render } from 'react-dom';
import App from './App';
import { installErrorHandler } from '../common/error';
import { getOriginalConsole } from '../common/logger';
import './reset.global.scss';
import './app.global.scss';

installErrorHandler((err) => {
  getOriginalConsole().log(err);
  // eslint-disable-next-line no-alert
  window.alert(`Error in DOM: ${err.toStringMessage()}`);
});

render(<App />, document.getElementById('root'));

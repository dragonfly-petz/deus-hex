import electronLog from 'electron-log';
import { globalLogger, Log } from '../../common/logger';

function electronLogLoggerHandler(log: Log) {
  const logFn = log.level === 'status' ? 'info' : log.level;
  const logger = electronLog.scope(log.source);
  logger[logFn](...log.args);
}

export function initElectronLogger() {
  electronLog.transports.console.level = false;
  electronLog.transports.file.sync = true;
  const filePathUsed = electronLog.transports.file.getFile().path;
  // eslint-disable-next-line no-console
  console.log(`Saving logs to ${filePathUsed}`);
  globalLogger.addHandler(electronLogLoggerHandler);
}

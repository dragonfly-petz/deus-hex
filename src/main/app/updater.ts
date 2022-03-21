import log from 'electron-log';
import { autoUpdater } from 'electron-updater';

export function checkForUpdates() {
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify();
}

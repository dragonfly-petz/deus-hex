import log from 'electron-log';
import { autoUpdater } from 'electron-updater';
import { UpdaterState } from '../../common/updater-state';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import { isDev } from './util';
import { globalErrorReporter } from '../../common/error';

const DEBUG_UPDATER = false;
export function checkForUpdates(updaterStateNode: ReactiveNode<UpdaterState>) {
  log.transports.file.level = 'info';
  autoUpdater.logger = log;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => {
    updaterStateNode.setValue({ tag: 'checking' });
  });

  autoUpdater.on('update-not-available', () => {
    updaterStateNode.setValue({ tag: 'not-available' });
  });

  autoUpdater.on('error', (e) => {
    updaterStateNode.setValue({ tag: 'error', error: `Updater error: ${e}` });
    globalErrorReporter.handleCaught(e);
  });

  autoUpdater.on('update-available', (info) => {
    updaterStateNode.setValue({ tag: 'available', version: info.version });
  });

  autoUpdater.on('download-progress', (info) => {
    updaterStateNode.setValueFn((it) => {
      return {
        tag: 'downloading',
        version: it.tag === 'available' ? it.version : null,
        percent: info.percent,
      };
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    updaterStateNode.setValue({ tag: 'downloaded', version: info.version });
  });

  autoUpdater.checkForUpdates();

  if (isDev() && DEBUG_UPDATER) {
    mockUpdater(updaterStateNode);
  }
}
function wait(ms: number): Promise<null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), ms);
  });
}

export async function mockUpdater(
  updaterStateNode: ReactiveNode<UpdaterState>
) {
  await wait(5e3);
  const e = new Error('Mock updater failure');
  updaterStateNode.setValue({ tag: 'error', error: `Updater error: ${e}` });
  globalErrorReporter.handleCaught(e);
  await wait(2e3);
  updaterStateNode.setValue({ tag: 'checking' });
  await wait(2e3);
  updaterStateNode.setValue({ tag: 'available', version: '2.0.0' });
  await wait(2e3);
  updaterStateNode.setValue({ tag: 'not-available' });
  await wait(2e3);
  updaterStateNode.setValue({
    tag: 'downloading',
    version: '2.0.0',
    percent: 0,
  });
  for (let i = 1; i <= 10; i++) {
    // eslint-disable-next-line no-await-in-loop
    await wait(500);
    updaterStateNode.setValue({
      tag: 'downloading',
      version: '2.0.0',
      percent: i * 10,
    });
  }
  await wait(1e3);
  updaterStateNode.setValue({ tag: 'downloaded', version: '2.0.0' });
}

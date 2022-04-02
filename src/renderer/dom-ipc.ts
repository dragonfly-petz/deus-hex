import { connectIpc, domIpcChannel, WrapWithCaughtError } from '../common/ipc';
import { getContextBridgeIpcRenderer } from './context-bridge';
import { ReactiveNode } from '../common/reactive/reactive-node';
import { FlashMessage, FlashMessageProps } from './framework/FlashMessage';
import { UserSettings } from '../main/app/persisted/user-settings';
import { Listenable } from '../common/reactive/listener';

export interface DomIpcDeps {
  flashMessagesNode: ReactiveNode<Map<string, FlashMessage>>;
}

export interface FileWatchChange {
  watcherId: string;
  filePath: string;
}

export class DomIpcBase {
  constructor(private deps: DomIpcDeps) {}

  userSettingsListenable = new Listenable<[UserSettings]>();

  fileWatchListenable = new Listenable<[FileWatchChange]>();

  // where modal / alert is appropriate
  async addUncaughtError(title: string, err: string) {
    return this.addFlashMessage({ kind: 'error', title, message: err });
  }

  // where flash message is appropriate
  async addCaughtError(title: string, err: string) {
    return this.addFlashMessage({ kind: 'warn', title, message: err });
  }

  async addFlashMessage(fmProps: FlashMessageProps) {
    this.deps.flashMessagesNode.setValueFn((it) => {
      const fm = new FlashMessage(fmProps);
      it.set(fm.id, fm);
      return it;
    });
  }

  async updateUserSettings(us: UserSettings) {
    this.userSettingsListenable.notify(us);
  }

  async onFileWatchChange(change: FileWatchChange) {
    console.log(change);
    this.fileWatchListenable.notify(change);
  }
}

export type DomIpc = WrapWithCaughtError<DomIpcBase>;

export function mkAndConnectDomIpc(deps: DomIpcDeps) {
  const domIpc = new DomIpcBase(deps);
  connectIpc(domIpc, domIpcChannel, getContextBridgeIpcRenderer());
  return domIpc;
}

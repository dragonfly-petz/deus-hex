import { connectIpc, domIpcChannel, WrapWithCaughtError } from '../common/ipc';
import { getContextBridgeIpcRenderer } from './context-bridge';
import { ReactiveNode } from '../common/reactive/reactive-node';
import { FlashMessage } from './framework/FlashMessage';
import { UserSettings } from '../main/app/persisted/user-settings';
import { Listenable } from '../common/reactive/listener';

export interface DomIpcDeps {
  flashMessagesNode: ReactiveNode<Map<string, FlashMessage>>;
}

export class DomIpcBase {
  constructor(private deps: DomIpcDeps) {}

  userSettingsListenable = new Listenable<[UserSettings]>();

  // where modal / alert is appropriate
  async addUncaughtError(title: string, err: string) {
    return this.addFlashMessage(new FlashMessage('error', title, err));
  }

  // where flash message is appropriate
  async addCaughtError(title: string, err: string) {
    return this.addFlashMessage(new FlashMessage('warn', title, err));
  }

  async addFlashMessage(fm: FlashMessage) {
    this.deps.flashMessagesNode.setValueFn((it) => {
      it.set(fm.id, fm);
      return it;
    });
  }

  async updateUserSettings(us: UserSettings) {
    this.userSettingsListenable.notify(us);
  }
}

export type DomIpc = WrapWithCaughtError<DomIpcBase>;

export function mkAndConnectDomIpc(deps: DomIpcDeps) {
  const domIpc = new DomIpcBase(deps);
  connectIpc(domIpc, domIpcChannel, getContextBridgeIpcRenderer());
  return domIpc;
}

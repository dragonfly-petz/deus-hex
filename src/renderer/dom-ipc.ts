import { connectIpc, domIpcChannel, WrapWithCaughtError } from '../common/ipc';
import { getContextBridgeIpcRenderer } from './context-bridge';
import { ReactiveNode } from './reactive-state/reactive-node';
import { FlashMessage } from './framework/FlashMessage';

export interface DomIpcDeps {
  flashMessages: ReactiveNode<Map<string, FlashMessage>>;
}

export class DomIpcBase {
  constructor(private deps: DomIpcDeps) {}

  // where modal / alert is appropriate
  async addUncaughtError(title: string, err: string) {
    return this.addFlashMessage(new FlashMessage('error', title, err));
  }

  // where flash message is appropriate
  async addCaughtError(title: string, err: string) {
    return this.addFlashMessage(new FlashMessage('warn', title, err));
  }

  async addFlashMessage(fm: FlashMessage) {
    this.deps.flashMessages.setValueFn((it) => {
      it.set(fm.id, fm);
      return it;
    });
  }
}

export type DomIpc = WrapWithCaughtError<DomIpcBase>;

export function mkAndConnectDomIpc(deps: DomIpcDeps) {
  const domIpc = new DomIpcBase(deps);
  connectIpc(domIpc, domIpcChannel, getContextBridgeIpcRenderer());
  return domIpc;
}

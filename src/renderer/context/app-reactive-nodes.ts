import { ReactiveNode } from '../reactive-state/reactive-node';
import { defaultTab } from '../layout/tab-names';
import { defaultFlashMessages } from '../dom-ipc';

export type AppReactiveNodes = ReturnType<typeof mkAppReactiveNodes>;

export function mkAppReactiveNodes() {
  const currentTabNode = new ReactiveNode(defaultTab);
  const flashMessages = new ReactiveNode(defaultFlashMessages());

  return {
    currentTabNode,
    flashMessages,
  };
}

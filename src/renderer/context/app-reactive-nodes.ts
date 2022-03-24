import { ReactiveNode } from '../reactive-state/reactive-node';
import { defaultTab } from '../layout/tab-names';
import type { FlashMessage } from '../framework/FlashMessage';

export type AppReactiveNodes = ReturnType<typeof mkAppReactiveNodes>;

export function mkAppReactiveNodes() {
  const currentTabNode = new ReactiveNode(defaultTab);
  const flashMessages = new ReactiveNode(new Map<string, FlashMessage>());

  return {
    currentTabNode,
    flashMessages,
  };
}

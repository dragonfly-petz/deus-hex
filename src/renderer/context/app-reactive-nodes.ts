import { ReactiveNode } from '../reactive-state/reactive-node';
import { defaultTab } from '../layout/tab-names';

export type AppReactiveNodes = ReturnType<typeof useMkAppReactiveNodes>;

export function useMkAppReactiveNodes() {
  const currentTabNode = new ReactiveNode(defaultTab);

  return {
    currentTabNode,
  };
}

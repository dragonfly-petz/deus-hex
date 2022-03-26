import { ReactiveNode } from '../../common/reactive/reactive-node';
import { defaultTab } from '../layout/tab-names';
import type { FlashMessage } from '../framework/FlashMessage';
import { RemoteObject } from '../../common/reactive/remote-object';
import { throwFromEither } from '../../common/fp-ts/either';
import { MainIpc } from '../../main/app/main-ipc';
import type { DomIpcBase } from '../dom-ipc';
import type { ResourcesPage } from '../page/PetzResources';

export type AppReactiveNodesStatic = ReturnType<typeof mkStaticReactiveNodes>;

export function mkStaticReactiveNodes() {
  const currentTabNode = new ReactiveNode(defaultTab);
  const flashMessagesNode = new ReactiveNode(new Map<string, FlashMessage>());
  const currentResourcesPage = new ReactiveNode<ResourcesPage>('overview');

  return {
    currentTabNode,
    flashMessagesNode,
    currentResourcesPage,
  };
}

export type AppReactiveNodesAsync = ReturnType<typeof mkAsyncReactiveNodes>;

export async function mkAsyncReactiveNodes(
  mainIpc: MainIpc,
  domIpc: DomIpcBase
) {
  const userSettings = throwFromEither(await mainIpc.getUserSettings());
  const userSettingsRemote = new RemoteObject(
    userSettings,
    (val) => mainIpc.setUserSettings(val),
    domIpc.userSettingsListenable
  );
  return {
    userSettingsRemote,
  };
}

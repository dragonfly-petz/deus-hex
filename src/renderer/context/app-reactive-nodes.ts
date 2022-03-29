import { ReactiveNode } from '../../common/reactive/reactive-node';
import { TabName } from '../layout/tab-names';
import type { FlashMessage } from '../framework/FlashMessage';
import { RemoteObject } from '../../common/reactive/remote-object';
import { throwFromEither } from '../../common/fp-ts/either';
import { MainIpc } from '../../main/app/main-ipc';
import type { DomIpcBase } from '../dom-ipc';
import type { ResourcesPage } from '../page/PetzResources';
import type { ModalDef } from '../framework/Modal';
import { isDev } from '../../main/app/util';
import type { ProjectsPage } from '../page/Projects';

export type AppReactiveNodesStatic = ReturnType<typeof mkStaticReactiveNodes>;

export function mkStaticReactiveNodes() {
  const currentTabNode = new ReactiveNode<TabName>(
    isDev() ? 'projects' : 'petzResources'
  );
  const flashMessagesNode = new ReactiveNode(new Map<string, FlashMessage>());
  const modalsNode = new ReactiveNode(new Map<string, ModalDef>());
  const currentResourcesPage = new ReactiveNode<ResourcesPage>(
    isDev() ? 'catz' : 'overview'
  );
  const currentProjectsPage = new ReactiveNode<ProjectsPage>('overview');
  return {
    currentTabNode,
    flashMessagesNode,
    currentResourcesPage,
    modalsNode,
    currentProjectsPage,
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
  const projectManagerFolders = throwFromEither(
    await mainIpc.getProjectManagerFolders()
  );
  return {
    userSettingsRemote,
    projectManagerFolders,
  };
}

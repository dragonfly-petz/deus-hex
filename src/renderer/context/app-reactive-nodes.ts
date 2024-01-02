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
import { getContextBridgeWindowParams } from '../context-bridge';
import { isNully } from '../../common/null';
import { run } from '../../common/function';
import { PromiseInner } from '../../common/promise';
import { ResourceDataSectionName } from '../../common/petz/file-types';
import { ScrollSignal } from '../editor/scroll-signal';

export type AppReactiveNodesStatic = ReturnType<typeof mkStaticReactiveNodes>;

export function mkStaticReactiveNodes() {
  const currentTabNode = new ReactiveNode<TabName>(
    isDev() ? 'editor' : 'petzResources'
  );
  const flashMessagesNode = new ReactiveNode(new Map<string, FlashMessage>());
  const modalsNode = new ReactiveNode(new Map<string, ModalDef>());
  const currentResourcesPage = new ReactiveNode<ResourcesPage>(
    isDev() ? 'clothes' : 'overview'
  );
  const currentProjectsPage = new ReactiveNode<ProjectsPage>('overview');
  const editorScrollSignal = new ReactiveNode<ScrollSignal>({ toLine: 0 });
  const currentEditorSection = new ReactiveNode<ResourceDataSectionName>(
    'clzClot'
  );
  const localFontSizeAdjust = new ReactiveNode<number>(0);
  const dropFileHasDrag = new ReactiveNode(false);
  return {
    currentTabNode,
    flashMessagesNode,
    currentResourcesPage,
    modalsNode,
    currentProjectsPage,
    currentEditorSection,
    editorScrollSignal,
    localFontSizeAdjust,
    dropFileHasDrag,
  };
}

export type AppReactiveNodesAsync = PromiseInner<
  ReturnType<typeof mkAsyncReactiveNodes>
>[0];

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
  const windowParams = getContextBridgeWindowParams();
  const editorParams = await run(async () => {
    if (isNully(windowParams.editorTarget)) {
      return null;
    }
    return mainIpc.fileToEditorParams(windowParams.editorTarget);
  });

  return [
    {
      userSettingsRemote,
      projectManagerFolders,
      editorParams: new ReactiveNode(editorParams),
    },
    () => userSettingsRemote.dispose(),
  ] as const;
}

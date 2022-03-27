import style from './PetzResources.module.scss';
import { useAppReactiveNodes, useMainIpc } from '../context/context';
import { RenderQuery, useMkQueryMemo } from '../framework/Query';
import {
  useListenReactiveVal,
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../reactive-state/reactive-hooks';
import type { ResourcesInfo } from '../../main/app/resource/resource-manager';
import { DropFile } from '../framework/form/DropFile';
import { Button } from '../framework/Button';
import { isNully, nullable } from '../../common/null';
import type { TabDef } from '../layout/Tabs';
import { ActionBar, ActionDef } from '../layout/ActionBar';
import { throwRejection, throwRejectionK } from '../../common/promise';
import { Panel, PanelBody, PanelButtons, PanelHeader } from '../layout/Panel';
import { ger } from '../../common/error';
import { ModalableProps, useModal } from '../framework/Modal';
import { E } from '../../common/fp-ts/fp';

const mkNavigation = () => {
  return {
    overview: {
      name: 'Overview',
      Content: OverviewPage,
    },
  };
};
export type ResourcesPage = keyof ReturnType<typeof mkNavigation>;

export function mkPetzResourcesTab(): TabDef {
  return {
    tabName: 'Petz Resources',
    TabContent: PetzResources,
    TabRightBar,
  };
}

export const PetzResources = () => {
  const navigation = mkNavigation();
  const mainIpc = useMainIpc();
  const { userSettingsRemote } = useAppReactiveNodes();

  const resourcesOverviewQuery = useMkQueryMemo(() =>
    mainIpc.getResourcesInfo()
  );
  useListenReactiveVal(
    userSettingsRemote.fmap.strict((it) => it.petzFolder),
    () => {
      throwRejectionK(() => resourcesOverviewQuery.reload());
    }
  );

  return (
    <div className={style.main}>
      <RenderQuery
        query={resourcesOverviewQuery}
        OnSuccess={({ value }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { currentResourcesPage } = useAppReactiveNodes();
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const currentPage = useReactiveVal(currentResourcesPage);
          const { Content } = navigation[currentPage];
          return <Content resourcesInfo={value} />;
        }}
        AdditionalOnError={PetzFolderForm}
      />
    </div>
  );
};

const TabRightBar = () => {
  const actions = new Array<ActionDef>();
  const { userSettingsRemote } = useAppReactiveNodes();
  const changePetzFolderModal = useModal({ Content: PetzFolderForm });

  actions.push(
    {
      label: 'Reset Petz Folder',
      icon: 'faEraser',
      key: 'clearPetzFolder',
      tooltip: 'Unsets your saved petz folder setting',
      action: () =>
        ger.withFlashMessage(
          userSettingsRemote.setRemotePartial({ petzFolder: null })
        ),
    },
    {
      label: 'Change Petz Folder',
      icon: 'faPencil',
      key: 'changePetzFolder',
      tooltip: 'Change your saved petz folder setting',
      action: async () => {
        changePetzFolderModal.setValue(true);
        return E.right(null);
      },
    }
  );

  return <ActionBar actions={actions} />;
};
const PetzFolderForm = ({ closeModal }: ModalableProps) => {
  const { userSettingsRemote } = useAppReactiveNodes();
  const pickedPathNode = useMkReactiveNodeMemo(nullable<string>());

  return (
    <Panel>
      <PanelHeader>Set Petz Folder</PanelHeader>
      <PanelBody>
        <DropFile validExtensions={new Set([''])} valueNode={pickedPathNode} />
      </PanelBody>
      <PanelButtons>
        <Button
          label="Save"
          onClick={() => {
            closeModal?.();
            const val = pickedPathNode.getValue();
            if (isNully(val)) return;
            throwRejection(
              ger.withFlashMessage(
                userSettingsRemote.setRemotePartial({ petzFolder: val })
              )
            );
          }}
        />
      </PanelButtons>
    </Panel>
  );
};
const OverviewPage = ({ resourcesInfo }: { resourcesInfo: ResourcesInfo }) => {
  return <div>{JSON.stringify(resourcesInfo)}</div>;
};

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

const mkNavigation = () => {
  return {
    overview: {
      name: 'Overview',
      Content: OverviewPage,
    },
  };
};
export type ResourcesPage = keyof ReturnType<typeof mkNavigation>;

export const PetzResources = () => {
  const navigation = mkNavigation();
  const mainIpc = useMainIpc();
  const { userSettingsRemote } = useAppReactiveNodes();

  const resourcesOverviewQuery = useMkQueryMemo(() =>
    mainIpc.getResourcesInfo()
  );
  useListenReactiveVal(userSettingsRemote, () => {
    resourcesOverviewQuery.reload();
  });

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
const PetzFolderForm = () => {
  const { userSettingsRemote } = useAppReactiveNodes();
  const pickedPathNode = useMkReactiveNodeMemo(
    nullable<string>('C:\\Users\\franc\\Documents\\Petz\\Petz 4')
  );

  return (
    <>
      <DropFile
        validExtensions={new Set([''])}
        onChange={(it) => pickedPathNode.setValue(it)}
      />
      <Button
        label="Save"
        onClick={() => {
          const val = pickedPathNode.getValue();
          if (isNully(val)) return;
          userSettingsRemote.setRemotePartial({ petzFolder: val });
        }}
      />
    </>
  );
};
const OverviewPage = ({ resourcesInfo }: { resourcesInfo: ResourcesInfo }) => {
  return <div>{JSON.stringify(resourcesInfo)}</div>;
};

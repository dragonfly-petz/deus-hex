import style from './PetzResources.module.scss';
import { useAppReactiveNodes, useMainIpc } from '../context/context';
import { RenderQuery, useMkQueryMemo } from '../framework/Query';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { ResourcesInfo } from '../../main/app/main-ipc';

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
  const resourcesOverviewQuery = useMkQueryMemo(() =>
    mainIpc.getResourcesInfo()
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
      />
    </div>
  );
};

const OverviewPage = ({}: { resourcesInfo: ResourcesInfo }) => {
  return null;
};

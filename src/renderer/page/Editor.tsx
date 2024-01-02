import style from './Editor.module.scss';
import { RenderQuery } from '../framework/Query';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import type { TabDef } from '../layout/Tabs';
import { TabDefs, useGetDeps } from './editor/get-deps';
import { TabLeftBar } from './editor/TabLeftBar';
import { TabRightBar } from './editor/TabRightBar';

export function mkEditorTab(): TabDef<TabDefs> {
  return {
    tabName: 'Editor',
    useGetDeps,
    TabContent: EditorC,
    TabRightBar,
    TabLeftBar,
    tabSettings: {
      centerContentClass: style.centerContentClass,
    },
  };
}

export function EditorC({
  fileInfoQuery,
  navigation,
  actionsNode,
  projectId,
  projectInfoQuery,
}: TabDefs) {
  return (
    <div className={style.main}>
      <RenderQuery
        query={fileInfoQuery}
        OnSuccess={({ value }) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const currentPage = useReactiveVal(navigation.node);
          const { Content } = navigation.items[currentPage];
          return (
            <Content
              fileInfo={value}
              actionsNode={actionsNode}
              fileInfoQuery={fileInfoQuery}
              projectId={projectId}
              projectInfoQuery={projectInfoQuery}
            />
          );
        }}
      />
    </div>
  );
}

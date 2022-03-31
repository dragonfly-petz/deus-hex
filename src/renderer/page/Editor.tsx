import { useEffect } from 'react';
import { pipe } from 'fp-ts/function';
import style from './Editor.module.scss';
import { useAppReactiveNodes, useMainIpc } from '../context/context';
import { RenderQuery, useMkQueryMemo } from '../framework/Query';
import {
  useMkReactiveNodeMemo,
  useReactiveVal,
  useSequenceMap,
} from '../reactive-state/reactive-hooks';
import { isNotNully, isNully } from '../../common/null';
import type { TabDef } from '../layout/Tabs';
import { ActionBar, ActionsNode } from '../layout/ActionBar';
import { E } from '../../common/fp-ts/fp';
import { Navigation, NavigationDef } from '../layout/NavgationBar';
import { FileInfoAndData } from '../../main/app/pe-files/pe-files-util';
import {
  EditorParams,
  ProjectId,
} from '../../main/app/resource/project-manager';
import { Result } from '../../common/result';
import { run } from '../../common/function';
import {
  fileTypeToExpectedSections,
  ResourceDataSectionName,
  resourceDataSections,
} from '../../common/petz/file-types';
import { unsafeObjectFromEntries } from '../../common/object';
import {
  getAllDataEntriesWithId,
  getResourceEntryById,
  ResourceEntryIdQuery,
  resourceEntryIdToStringKey,
} from '../../common/petz/codecs/rsrc-utility';
import { safeHead } from '../../common/array';
import { renderResult } from '../framework/result';
import { renderIf } from '../framework/render';
import { Banner, BannerBody, BannerButtons } from '../layout/Banner';
import { useModal } from '../framework/Modal';
import { NewProjectForm } from './Projects';
import { Button } from '../framework/Button';
import { taggedValue } from '../../common/tagged-value';
import { bytesToString } from '../../common/buffer';
import { TextArea } from '../framework/form/TextArea';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import { mapMapValue } from '../../common/map';
import { normalizeLineEndingsForTextArea } from '../../common/string';

type EditedEntriesStringMapNode = ReactiveNode<
  Map<string, ReactiveNode<string>>
>;

interface NavigationDeps {
  fileInfo: FileInfoAndData & {
    originalEntriesStringMap: Map<string, string>;
    editedEntriesStringMapNode: EditedEntriesStringMapNode;
  };
  // eslint-disable-next-line react/no-unused-prop-types
  actionsNode: ActionsNode;
  // eslint-disable-next-line react/no-unused-prop-types
  fileInfoQuery: TabDefs['fileInfoQuery'];
  // eslint-disable-next-line react/no-unused-prop-types
  projectId: ProjectId | null;
}

const SectionName = ({
  name,
  fileInfo,
}: NavigationDeps & {
  name: ResourceDataSectionName;
}) => {
  const sequencedMap = useSequenceMap(fileInfo.editedEntriesStringMapNode);
  const entWithIdM = getResourceEntryById(
    fileInfo.resDirTable,
    resourceDataSections[name].idMatcher
  );
  const editedEntriesMap = useReactiveVal(sequencedMap);
  const originalMap = fileInfo.originalEntriesStringMap;

  const isEdited = run(() => {
    if (isNully(entWithIdM)) return false;
    const key = resourceEntryIdToStringKey(entWithIdM.id);
    const original = originalMap.get(key);
    const edited = editedEntriesMap.get(key);
    return isNotNully(original) && isNotNully(edited) && original !== edited;
  });
  return (
    <div>
      {name}
      {isEdited ? '*' : ''}
    </div>
  );
};
const useMkNavigation = (
  params: Result<EditorParams> | null
): NavigationDef<string, NavigationDeps, NavigationDeps> => {
  const node = useAppReactiveNodes().currentEditorSection;
  const nav = run((): NavigationDef<string, NavigationDeps, NavigationDeps> => {
    if (isNully(params) || E.isLeft(params) || params.right.tag === 'invalid') {
      return {
        node,
        items: {},
        names: [],
      };
    }
    const names = fileTypeToExpectedSections[params.right.value.type];
    const items = unsafeObjectFromEntries(
      names.map((n) => [
        n,
        {
          name: (props: NavigationDeps) => <SectionName {...props} name={n} />,
          Content: (deps: NavigationDeps) => {
            const editorParamsNode = useAppReactiveNodes().editorParams;
            const newProjectModalNode = useModal({
              Content: (rest) => (
                <NewProjectForm
                  // eslint-disable-next-line react/destructuring-assignment
                  {...rest.modalProps}
                  onProjectCreated={(res) => {
                    editorParamsNode.setValue(
                      E.right(
                        taggedValue('info', {
                          path: res.currentFile,
                          type: res.projectId.type,
                          projectId: res.projectId,
                        })
                      )
                    );
                  }}
                  fixedPath={deps.fileInfo.filePath}
                />
              ),
            });

            return (
              <>
                {renderIf(isNully(deps.projectId), () => (
                  <Banner kind="warn">
                    <BannerBody>
                      This file is not part of a project at the moment.
                    </BannerBody>
                    <BannerButtons>
                      <Button
                        onClick={() => newProjectModalNode.setValue(true)}
                        label="New Project from this File"
                      />
                    </BannerButtons>
                  </Banner>
                ))}

                <SectionPage
                  entryIdQuery={resourceDataSections[n].idMatcher}
                  {...deps}
                />
              </>
            );
          },
        },
      ])
    );
    return {
      names,
      node,
      items,
    };
  });
  const defaultPage = safeHead(nav.names);
  useEffect(() => {
    if (isNotNully(defaultPage)) {
      node.setValue(defaultPage);
    }
  }, [defaultPage, node]);

  return nav;
};

function useGetDeps() {
  const mainIpc = useMainIpc();
  const params = useReactiveVal(useAppReactiveNodes().editorParams);

  const navigation = useMkNavigation(params);

  const fileInfoQuery = useMkQueryMemo(async () => {
    if (isNully(params)) {
      return E.left('No file currently selected for editor to work with');
    }
    if (E.isLeft(params)) {
      return params;
    }
    if (params.right.tag === 'invalid') {
      return E.left(
        `Invalid file ${params.right.value.file}: ${params.right.value.message}`
      );
    }
    const res = await mainIpc.getFileInfoAndData(params.right.value.path);
    return pipe(
      res,
      E.map((resIn) => {
        const entries = getAllDataEntriesWithId(resIn.resDirTable);
        const map = new Map(
          entries.map((it) => [
            resourceEntryIdToStringKey(it.id),
            normalizeLineEndingsForTextArea(bytesToString(it.entry.data)),
          ])
        );
        const editedEntriesStringMapNode = new ReactiveNode(
          mapMapValue(map, (it) => new ReactiveNode(it))
        );
        return {
          ...resIn,
          originalEntriesStringMap: map,
          editedEntriesStringMapNode,
        };
      })
    );
  }, [params]);
  const actionsNode: ActionsNode = useMkReactiveNodeMemo(new Map());
  const projectId = isNully(params)
    ? null
    : pipe(
        params,
        E.map((it) => {
          if (it.tag === 'invalid') return null;
          return it.value.projectId;
        }),
        E.getOrElseW(() => null)
      );
  return {
    navigation,
    fileInfoQuery,
    actionsNode,
    projectId,
  };
}

type TabDefs = ReturnType<typeof useGetDeps>;

export function mkEditorTab(): TabDef<TabDefs> {
  return {
    tabName: 'Editor',
    useGetDeps,
    TabContent: EditorC,
    TabRightBar,
    TabLeftBar,
  };
}

export const EditorC = ({
  fileInfoQuery,
  navigation,
  actionsNode,
  projectId,
}: TabDefs) => {
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
            />
          );
        }}
      />
    </div>
  );
};
const TabLeftBar = (deps: TabDefs) => {
  const { navigation, fileInfoQuery, projectId } = deps;
  return (
    <>
      <RenderQuery
        query={fileInfoQuery}
        OnSuccess={({ value }) => {
          return (
            <>
              <Navigation
                navigationNames={navigation.names}
                items={navigation.items}
                node={navigation.node}
                labelDeps={{ ...deps, fileInfo: value }}
              />
              <div className={style.rcData}>
                <RcDataRow label="Path" value={value.filePath} />
                <RcDataRow label="Item Name" value={value.itemName} />
                <RcDataRow
                  label="Sprite Name"
                  value={value.rcDataAndEntry.rcData.spriteName}
                />
                <RcDataRow
                  label="Display Name"
                  value={value.rcDataAndEntry.rcData.displayName}
                />
                <RcDataRow
                  label="Breed Id"
                  value={value.rcDataAndEntry.rcData.breedId.toFixed()}
                />
                <RcDataRow
                  label="Tag"
                  value={value.rcDataAndEntry.rcData.tag.toFixed()}
                />
                <RcDataRow
                  label="Is Project?"
                  value={
                    isNully(projectId)
                      ? 'No'
                      : `Yes - ${projectId.name} - ${projectId.type}`
                  }
                />
              </div>
            </>
          );
        }}
      />
    </>
  );
};

const RcDataRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className={style.rcDataRow}>
      <div className={style.rcDataLabel}>{label}</div>
      <div className={style.rcDataValue}>{value}</div>
    </div>
  );
};

const TabRightBar = ({ actionsNode }: TabDefs) => {
  return <ActionBar actions={actionsNode} />;
};

const SectionPage = ({
  fileInfo,
  entryIdQuery,
}: NavigationDeps & { entryIdQuery: ResourceEntryIdQuery }) => {
  const entWithIdM = getResourceEntryById(fileInfo.resDirTable, entryIdQuery);
  const asEither = E.fromNullable('Section not found')(entWithIdM);

  return renderResult(asEither, (entWithId) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const map = useReactiveVal(fileInfo.editedEntriesStringMapNode);
    const stringKey = resourceEntryIdToStringKey(entWithId.id);
    const node = map.get(stringKey);
    if (isNully(node)) {
      return <div>Expected to find edit node for section key {stringKey}</div>;
    }
    return (
      <>
        <h2>Editing section {resourceEntryIdToStringKey(entWithId.id)}</h2>
        <TextArea valueNode={node} />
      </>
    );
  });
};

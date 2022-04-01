import { useEffect } from 'react';
import { pipe } from 'fp-ts/function';
import style from './Editor.module.scss';
import { useAppReactiveNodes, useMainIpc } from '../context/context';
import { RenderQuery, useMkQueryMemo } from '../framework/Query';
import {
  sequenceReactiveArray,
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../reactive-state/reactive-hooks';
import { isNotNully, isNully } from '../../common/null';
import type { TabDef } from '../layout/Tabs';
import { ActionBar, ActionsNode, useAddActions } from '../layout/ActionBar';
import { E, O } from '../../common/fp-ts/fp';
import { Navigation, NavigationDef } from '../layout/NavgationBar';
import { FileInfoAndData } from '../../main/app/pe-files/pe-files-util';
import {
  EditorParams,
  ProjectId,
} from '../../main/app/resource/project-manager';
import { Result } from '../../common/result';
import { identity, run } from '../../common/function';
import {
  fileTypeToExpectedSections,
  ResourceDataSectionName,
  resourceDataSections,
} from '../../common/petz/file-types';
import { unsafeObjectFromEntries } from '../../common/object';
import {
  getAllDataEntriesWithId,
  getResourceEntryById,
  ResourceEntryId,
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
import { bytesToString, stringToBytes } from '../../common/buffer';
import { TextArea } from '../framework/form/TextArea';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import { normalizeLineEndingsForTextArea } from '../../common/string';
import { ReactiveVal } from '../../common/reactive/reactive-interface';
import { ger } from '../../common/error';

interface NavigationDeps {
  fileInfo: FileInfoAndData & {
    sectionAsStringMap: Map<string, SectionAsString>;
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
  const hasChangedNode = run(() => {
    const entWithIdM = getResourceEntryById(
      fileInfo.resDirTable,
      resourceDataSections[name].idMatcher
    );
    if (isNully(entWithIdM)) return new ReactiveNode(false);
    const key = resourceEntryIdToStringKey(entWithIdM.id);
    return (
      fileInfo.sectionAsStringMap.get(key)?.hasChanged ??
      new ReactiveNode(false)
    );
  });
  const hasChanged = useReactiveVal(hasChangedNode);
  return (
    <div>
      {name}
      {hasChanged ? '*' : ''}
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

interface SectionAsString {
  original: string;
  editNode: ReactiveNode<string>;
  hasChanged: ReactiveVal<boolean>;
  id: ResourceEntryId;
}

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
        const sectionAsStringMap = new Map<string, SectionAsString>(
          entries.map((it) => {
            const original = normalizeLineEndingsForTextArea(
              bytesToString(it.entry.data)
            );
            const editNode = new ReactiveNode(original);

            return [
              resourceEntryIdToStringKey(it.id),
              {
                original,
                editNode,
                hasChanged: editNode.fmapStrict((str) => str !== original),
                id: it.id,
              },
            ];
          })
        );
        return {
          ...resIn,
          sectionAsStringMap,
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

const TabRightBar = ({ actionsNode, fileInfoQuery, projectId }: TabDefs) => {
  return (
    <>
      <RenderQuery
        query={fileInfoQuery}
        OnSuccess={({ value }) => {
          const mainIpc = useMainIpc();
          const sections = Array.from(value.sectionAsStringMap.values()).map(
            (it) => it.hasChanged
          );
          const anyChangedNode = sequenceReactiveArray(sections).fmapStrict(
            (it) => it.some(identity)
          );
          const getSectsToSave = () => {
            return Array.from(value.sectionAsStringMap).map((it) => {
              return {
                id: it[1].id,
                data: new Uint8Array(stringToBytes(it[1].editNode.getValue())),
              };
            });
          };
          useAddActions(actionsNode, (actions) => {
            actions.push({
              label: 'Open Containing Folder',
              icon: 'faFolderOpen',
              key: 'openFolder',
              tooltip: 'Open folder that contains this file',
              action: () => {
                return mainIpc.openDirInExplorer(value.pathParsed.dir);
              },
            });

            actions.push({
              label: 'Save',
              icon: 'faSave',
              key: 'save',
              tooltip: 'Save this file',
              disable: anyChangedNode.fmapStrict((it) =>
                it ? O.none : O.of('No changes made')
              ),
              action: () => {
                return ger.withFlashMessageK(async () => {
                  const res = await mainIpc.saveResourceSections(
                    value.filePath,
                    getSectsToSave()
                  );
                  if (E.isRight(res)) {
                    fileInfoQuery.reload();
                  }
                  return res;
                });
              },
            });
            if (isNotNully(projectId)) {
              actions.push({
                label: 'Save Backup',
                icon: 'faSave',
                key: 'saveBackup',
                tooltip:
                  "Save the current changes as a backup file but don't save them to the current file",
                disable: anyChangedNode.fmapStrict((it) =>
                  it ? O.none : O.of('No changes made')
                ),
                action: () => {
                  return ger.withFlashMessage(
                    mainIpc.saveResourceSections(
                      value.filePath,
                      getSectsToSave(),
                      { backup: true }
                    )
                  );
                },
              });
            }
          });

          return <ActionBar actions={actionsNode} />;
        }}
      />
    </>
  );
};

const SectionPage = ({
  fileInfo,
  entryIdQuery,
}: NavigationDeps & { entryIdQuery: ResourceEntryIdQuery }) => {
  const entWithIdM = getResourceEntryById(fileInfo.resDirTable, entryIdQuery);
  const asEither = E.fromNullable('Section not found')(entWithIdM);

  return renderResult(asEither, (entWithId) => {
    const stringKey = resourceEntryIdToStringKey(entWithId.id);
    const node = fileInfo.sectionAsStringMap.get(stringKey)?.editNode;
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

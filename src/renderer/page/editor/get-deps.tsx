import { useEffect, useMemo } from 'react';
import { pipe } from 'fp-ts/function';
import {
  useAppContext,
  useAppReactiveNodes,
  useDomIpc,
  useMainIpc,
} from '../../context/context';
import {
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../../reactive-state/reactive-hooks';
import { run } from '../../../common/function';
import { isNotNully, isNully, nullable } from '../../../common/null';
import { E } from '../../../common/fp-ts/fp';
import { useMkQueryMemo } from '../../framework/Query';
import {
  getAllDataEntriesWithId,
  getSingleResourceEntryById,
  resDataEntryToString,
  ResDataEntryWithId,
  resourceEntryIdToStringKey,
} from '../../../common/petz/codecs/rsrc-utility';
import { stringToBytes } from '../../../common/buffer';
import { useDisposableEffectWithDeps } from '../../hooks/disposable-memo';
import { Disposer } from '../../../common/disposable';
import { ger } from '../../../common/error';
import { applyAntiPetWorkshopReplacements } from '../../../common/petz/transform/transforms';
import { ActionsNode } from '../../layout/ActionBar';
import { Result } from '../../../common/result';
import {
  EditorFileInfo,
  EditorParams,
  ProjectId,
} from '../../../main/app/resource/project-manager';
import { NavigationDef } from '../../layout/NavigationBar';
import {
  fileTypeToExpectedSections,
  mkResourceDataSections,
  ResourceDataSectionName,
} from '../../../common/petz/file-types';
import { unsafeObjectFromEntries } from '../../../common/object';
import { useModal } from '../../framework/Modal';
import { NewProjectForm } from '../Projects';
import { taggedValue } from '../../../common/tagged-value';
import { renderIf } from '../../framework/render';
import { Banner, BannerBody, BannerButtons } from '../../layout/Banner';
import { Button } from '../../framework/Button';
import { safeHead } from '../../../common/array';
import { ReactiveNode } from '../../../common/reactive/reactive-node';
import { parseLnz } from '../../../common/petz/parser/main';
import { FileInfoAndData } from '../../../main/app/pe-files/pe-files-util';
import { SectionDataNodes, SectionPage } from './SectionPage';

export interface NavigationDeps {
  fileInfo: FileInfoAndData & {
    sectionDataNodes: Map<string, SectionDataNodes>;
  };
  actionsNode: ActionsNode;
  fileInfoQuery: TabDefs['fileInfoQuery'];
  projectInfoQuery: TabDefs['projectInfoQuery'];
  projectId: ProjectId | null;
}

function SectionName({
  name,
  fileInfo,
}: NavigationDeps & {
  name: ResourceDataSectionName;
}) {
  const resourceDataSections = mkResourceDataSections(
    fileInfo.rcDataAndEntry.rcData
  );
  const hasChangedNode = run(() => {
    const entWithIdM = getSingleResourceEntryById(
      fileInfo.resDirTable,
      resourceDataSections[name].idMatcher
    );
    if (isNully(entWithIdM)) return new ReactiveNode(false);
    const key = resourceEntryIdToStringKey(entWithIdM.id);
    return (
      fileInfo.sectionDataNodes.get(key)?.hasChanged ?? new ReactiveNode(false)
    );
  });
  const hasChanged = useReactiveVal(hasChangedNode);
  return (
    <div>
      {resourceDataSections[name].name}
      {hasChanged ? '*' : ''}
    </div>
  );
}

const useMkNavigation = (
  params: Result<EditorParams> | null
): NavigationDef<ResourceDataSectionName, NavigationDeps, NavigationDeps> => {
  const node = useAppReactiveNodes().currentEditorSection;
  const nav = run(
    (): NavigationDef<
      ResourceDataSectionName,
      NavigationDeps,
      NavigationDeps
    > => {
      if (
        isNully(params) ||
        E.isLeft(params) ||
        params.right.tag === 'invalid'
      ) {
        return {
          node,
          items: {} as any,
          names: [],
        };
      }
      const names = fileTypeToExpectedSections[params.right.value.type];
      const items = unsafeObjectFromEntries(
        names.map((n) => [
          n,
          {
            name: (props: NavigationDeps) => (
              <SectionName {...props} name={n} />
            ),
            Content: (deps: NavigationDeps) => {
              const editorParamsNode = useAppReactiveNodes().editorParams;

              const newProjectModalNode = useModal({
                // eslint-disable-next-line react/no-unstable-nested-components
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

                  <SectionPage sectionName={n} {...deps} />
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
    }
  );
  const defaultPage = safeHead(nav.names);
  useEffect(() => {
    if (isNotNully(defaultPage)) {
      node.setValue(defaultPage);
    }
  }, [defaultPage, node]);

  return nav;
};

export function useGetDeps() {
  const mainIpc = useMainIpc();
  const domIpc = useDomIpc();
  const params = useReactiveVal(useAppReactiveNodes().editorParams);
  const { windowId } = useAppContext();
  const navigation = useMkNavigation(params);

  const editorFileInfo = run(() => {
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
    return E.right(params.right.value);
  });

  const projectInfoQuery = useMkQueryMemo(async () => {
    if (E.isLeft(editorFileInfo)) {
      return editorFileInfo;
    }
    if (isNotNully(editorFileInfo.right.projectId)) {
      return mainIpc.getProjectById(editorFileInfo.right.projectId);
    }
    return E.right(null);
  }, [editorFileInfo]);

  const sectionDataNodesHolder = useMemo(
    () => ({ map: new Map<string, SectionDataNodes>() }),
    []
  );

  const fileInfoQuery = useMkQueryMemo(async () => {
    if (E.isLeft(editorFileInfo)) {
      return editorFileInfo;
    }
    const { projectId } = editorFileInfo.right;
    const res = await mainIpc.getFileInfoAndData(editorFileInfo.right.path);
    return pipe(
      res,
      E.map((resIn) => {
        const entries = getAllDataEntriesWithId(resIn.resDirTable);
        sectionDataNodesHolder.map = createOrUpdateSections(
          sectionDataNodesHolder.map,
          entries,
          editorFileInfo.right
        );
        const sectionDataNodes = sectionDataNodesHolder.map;
        return {
          projectId,
          ...resIn,
          sectionDataNodes,
          getSectsToSave: () => {
            return Array.from(sectionDataNodes).map((it) => {
              return {
                id: it[1].id,
                data: new Uint8Array(stringToBytes(it[1].editNode.getValue())),
              };
            });
          },
        };
      })
    );
  }, [editorFileInfo]);

  useDisposableEffectWithDeps(() => {
    let watchDisposer = nullable<Promise<Disposer>>();
    const listenDispose = fileInfoQuery.listen((change) => {
      run(async () => {
        if (isNotNully(watchDisposer)) {
          // eslint-disable-next-line promise/catch-or-return
          (await watchDisposer)();
          watchDisposer = null;
        }
        if (change.tag === 'success' && isNotNully(change.value.projectId)) {
          watchDisposer = run(async () => {
            const { value } = change;
            const fileToWatch = change.value.filePath;
            const watcherId = await mainIpc.watchFile(change.value.filePath, [
              windowId,
            ]);

            const fileChangeDispose = domIpc.fileWatchListenable.listen(
              async (fwChange) => {
                if (
                  E.isRight(watcherId) &&
                  watcherId.right === fwChange.filePath
                ) {
                  const res = await ger.withFlashMessage(
                    mainIpc.saveResourceSections(
                      value.filePath,
                      value.getSectsToSave(),
                      { backup: 'external' }
                    )
                  );
                  if (E.isRight(res)) {
                    const oldValues = Array.from(
                      value.sectionDataNodes.entries()
                    ).map((it) => [it[0], it[1].editNode.getValue()] as const);
                    const reloadFilePromise = fileInfoQuery.reloadSoft();
                    projectInfoQuery.reloadSoft();
                    const newFileVal = await reloadFilePromise;
                    if (E.isRight(newFileVal)) {
                      for (const [sectKey, originalSectEditNode] of oldValues) {
                        if (sectKey.slice(0, 3) !== 'LNZ') {
                          continue;
                        }
                        const newSect =
                          newFileVal.right.sectionDataNodes.get(sectKey);
                        if (isNotNully(newSect)) {
                          const applyRes = applyAntiPetWorkshopReplacements(
                            originalSectEditNode,
                            newSect.editNode.getValue(),
                            newFileVal.right.fileType
                          );
                          if (isNotNully(applyRes)) {
                            if (E.isRight(applyRes)) {
                              ger.addFm({
                                kind: 'info',
                                title: `Changes reapplied to optional columns in ${sectKey}`,
                                message: `${applyRes.right[0]}\nNote: changes have been applied in the editor and haven't been saved yet`,
                              });
                              newSect.editNode.setValue(applyRes.right[1]);
                            } else {
                              ger.addFm({
                                kind: 'error',
                                title:
                                  'Attempt to reapply optional columns failed',
                                message: applyRes.left,
                              });
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            );
            return () => {
              fileChangeDispose();
              if (E.isRight(watcherId)) {
                mainIpc.unwatchFile(fileToWatch, [windowId]);
              }
            };
          });
        }
      });
    }, true);
    return () => {
      listenDispose();
      watchDisposer?.then(run);
    };
  }, [fileInfoQuery, domIpc]);

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
    projectInfoQuery,
    actionsNode,
    projectId,
  };
}

export type TabDefs = ReturnType<typeof useGetDeps>;

function createOrUpdateSections(
  oldMap: Map<string, SectionDataNodes>,
  entries: ResDataEntryWithId[],
  editorFileInfo: EditorFileInfo
) {
  const newMap = new Map<string, SectionDataNodes>();
  entries.forEach((it) => {
    const key = resourceEntryIdToStringKey(it.id);
    const oldEntry = oldMap.get(key);
    const { data } = it.entry;
    const original = resDataEntryToString(it.entry);
    if (isNully(oldEntry)) {
      const editNode = new ReactiveNode(original);
      const isParsing = new ReactiveNode(false);
      const parsedData = editNode
        .fmapStrict((newVal) => {
          isParsing.setValue(true);
          return newVal;
        })
        .fmapStrict((newVal) => {
          const ret = parseLnz(newVal, editorFileInfo.type);
          isParsing.setValue(false);
          return ret;
        }, 2e3);
      const originalHolder = { original };
      newMap.set(key, {
        data,
        original,
        originalHolder,
        editNode,
        parsedData,
        isParsing,
        hasChanged: editNode.fmapStrict(
          (str) => str !== originalHolder.original
        ),
        id: it.id,
      });
      return;
    }
    oldEntry.originalHolder.original = original;
    oldEntry.editNode.setValue(original);
    newMap.set(key, {
      ...oldEntry,
      data,
      original,
    });
  });
  return newMap;
}

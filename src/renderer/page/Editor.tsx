import { ReactNode, useEffect } from 'react';
import { pipe } from 'fp-ts/function';
import { isString } from 'fp-ts/string';
import bmp from '@wokwi/bmp-ts';
import style from './Editor.module.scss';
import { useAppContext, useAppReactiveNodes, useDomIpc, useMainIpc, useUserSetting } from '../context/context';
import { QueryInner, RenderQuery, useMkQueryMemo } from '../framework/Query';
import { sequenceReactiveArray, useMkReactiveNodeMemo, useReactiveVal } from '../reactive-state/reactive-hooks';
import { isNotNully, isNully, nullable } from '../../common/null';
import type { TabDef } from '../layout/Tabs';
import { ActionBar, ActionsNode, useAddActions } from '../layout/ActionBar';
import { E, O } from '../../common/fp-ts/fp';
import { Navigation, NavigationDef } from '../layout/NavgationBar';
import { FileInfoAndData } from '../../main/app/pe-files/pe-files-util';
import { EditorParams, ProjectId } from '../../main/app/resource/project-manager';
import { Result } from '../../common/result';
import { identity, run } from '../../common/function';
import {
  fileTypeToExpectedSections,
  ResourceDataSectionName,
  resourceDataSections
} from '../../common/petz/file-types';
import { unsafeObjectFromEntries } from '../../common/object';
import {
  getAllDataEntriesWithId,
  getResourceEntryById,
  resDataEntryToString,
  ResourceEntryId,
  resourceEntryIdToStringKey
} from '../../common/petz/codecs/rsrc-utility';
import { safeHead, sortByNumeric } from '../../common/array';
import { renderResult } from '../framework/result';
import { renderIf, renderNullable } from '../framework/render';
import { Banner, BannerBody, BannerButtons } from '../layout/Banner';
import { ModalContentProps, useModal } from '../framework/Modal';
import { NewProjectForm } from './Projects';
import { Button } from '../framework/Button';
import { taggedValue } from '../../common/tagged-value';
import { bytesToString, stringToBytes } from '../../common/buffer';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import { ReactiveVal } from '../../common/reactive/reactive-interface';
import { ger } from '../../common/error';
import { useDisposableEffectWithDeps } from '../hooks/disposable-memo';
import { Disposer } from '../../common/disposable';
import { formatDateDistance } from '../../common/df';
import { throwRejectionK } from '../../common/promise';
import { Panel, PanelBody, PanelButtons, PanelHeader } from '../layout/Panel';
import { renderId } from '../helper/helper';
import { isNever } from '../../common/type-assertion';
import { CodeMirror } from '../editor/CodeMirror';
import { applyAntiPetWorkshopReplacements } from '../../common/petz/transform/transforms';

interface NavigationDeps {
  fileInfo: FileInfoAndData & {
    sectionAsStringMap: Map<string, SectionAsString>;
  };
  actionsNode: ActionsNode;
  fileInfoQuery: TabDefs['fileInfoQuery'];
  projectInfoQuery: TabDefs['projectInfoQuery'];
  projectId: ProjectId | null;
}

type FileInfoQueryResult = QueryInner<TabDefs['fileInfoQuery']>;

function SectionName({
  name,
  fileInfo,
}: NavigationDeps & {
  name: ResourceDataSectionName;
}) {
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
      {resourceDataSections[name].name}
      {hasChanged ? '*' : ''}
    </div>
  );
}

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

                <SectionPage
                  entryIdQuery={resourceDataSections[n].idMatcher}
                  sectionName={n}
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
  data: Uint8Array;
  original: string;
  editNode: ReactiveNode<string>;
  hasChanged: ReactiveVal<boolean>;
  id: ResourceEntryId;
}

function useGetDeps() {
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
        const sectionAsStringMap = new Map<string, SectionAsString>(
          entries.map((it) => {
            const { data } = it.entry;
            const original = resDataEntryToString(it.entry);
            const editNode = new ReactiveNode(original);

            return [
              resourceEntryIdToStringKey(it.id),
              {
                data,
                original,
                editNode,
                hasChanged: editNode.fmapStrict((str) => str !== original),
                id: it.id,
              },
            ];
          })
        );
        return {
          projectId,
          ...resIn,
          sectionAsStringMap,
          getSectsToSave: () => {
            return Array.from(sectionAsStringMap).map((it) => {
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
                    const reloadFilePromise = fileInfoQuery.reloadSoft();
                    projectInfoQuery.reloadSoft();
                    const newFileVal = await reloadFilePromise;
                    if (E.isRight(newFileVal)) {
                      for (const [
                        sectKey,
                        originalSect,
                      ] of value.sectionAsStringMap.entries()) {
                        if (sectKey.slice(0, 3) !== 'LNZ') {
                          continue;
                        }
                        const newSect =
                          newFileVal.right.sectionAsStringMap.get(sectKey);
                        if (isNotNully(newSect)) {
                          const applyRes = applyAntiPetWorkshopReplacements(
                            originalSect.editNode.getValue(),
                            newSect.editNode.getValue()
                          );
                          if (isNotNully(applyRes)) {
                            if (E.isRight(applyRes)) {
                              newSect.editNode.setValue(applyRes.right);
                            } else {
                              ger.addFm({
                                kind: 'error',
                                title: 'Pet Workshop replacements failed',
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

type TabDefs = ReturnType<typeof useGetDeps>;

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

function TabLeftBar(deps: TabDefs) {
  const { navigation, fileInfoQuery, projectId, projectInfoQuery } = deps;
  return (
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
            <RcDataInfo value={value} projectId={projectId} />
            <BackupsInfo
              projectInfoQuery={projectInfoQuery}
              projectId={projectId}
            />
          </>
        );
      }}
    />
  );
}

function RcDataInfo({
  value,
  projectId,
}: {
  value: FileInfoQueryResult;
  projectId: ProjectId | null;
}) {
  return (
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
        value={renderId(value.rcDataAndEntry.rcData.breedId)}
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
  );
}

function RcDataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={style.rcDataRow}>
      <div className={style.rcDataLabel}>{label}</div>
      <div className={style.rcDataValue}>{value}</div>
    </div>
  );
}

function BackupsInfo({
  projectInfoQuery,
  projectId,
}: {
  projectInfoQuery: NavigationDeps['projectInfoQuery'];
  projectId: ProjectId | null;
}) {
  const editorParamsNode = useAppReactiveNodes().editorParams;
  const mainIpc = useMainIpc();
  if (isNully(projectId)) {
    return null;
  }
  return renderNullable(projectId, () => {
    return (
      <div className={style.externalBackups}>
        <h2>External change backups</h2>
        <RenderQuery
          query={projectInfoQuery}
          OnSuccess={({ value }) => {
            return renderNullable(value, (infoE) => {
              return renderResult(infoE.info, (info) => {
                const sorted = info.temporaryBackups.slice();
                sortByNumeric(sorted, (it) => -it.savedDate.getTime());
                return (
                  <>
                    {sorted.map((back) => {
                      return (
                        <div key={back.path} className={style.backup}>
                          <div className={style.date}>
                            {formatDateDistance(back.savedDate)}
                          </div>
                          <div className={style.button}>
                            <Button
                              label="Restore"
                              onClick={() => {
                                throwRejectionK(async () => {
                                  const res = await ger.withFlashMessageK(
                                    async () => {
                                      return mainIpc.restoreProjectFrom(
                                        projectId,
                                        back.path
                                      );
                                    }
                                  );
                                  if (E.isRight(res)) {
                                    editorParamsNode.setValue(res);
                                  }
                                });
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              });
            });
          }}
        />
      </div>
    );
  });
}

interface OverwriteModalOpts {
  continue: () => void;
  filePath: string;
}

function TabRightBar({
  actionsNode,
  fileInfoQuery,
  projectId,
  projectInfoQuery,
}: TabDefs) {
  const petzFolder = useUserSetting('petzFolder');
  const onContinueNode = useMkReactiveNodeMemo(nullable<OverwriteModalOpts>());
  const overwriteModalNode = useOverwriteModal(onContinueNode);
  return (
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
                  value.getSectsToSave()
                );
                if (E.isRight(res)) {
                  fileInfoQuery.reloadSoft();
                  projectInfoQuery.reloadSoft();
                }
                return res;
              });
            ,
          });
          if (isNotNully(projectId)) {
            actions.push({
              label: 'Save Backup',
              icon: 'faSave',
              key: 'saveBackup',
              tooltip:
               'Save the current changes as a backup file but don\'t save them to the current file'",
              action: () => {
                return ger.withFlashMessageK(async () => {
                  const res = await mainIpc.saveResourceSections(
                    value.filePath,
                    value.getSectsToSave(),
                    { backup: 'explicit' }
                  );
                  if (E.isRight(res)) {
                    projectInfoQuery.reload();
                  }
                  return res;
                });
              ,
            });

            actions.push({
              label: 'Export Current To Game',
              icon: 'faFileExport',
              key: 'exportCurrent',
              disable: isNully(petzFolder)
                ? 'You must set a Petz folder to use this function'
                : undefined,
              tooltip:
                'Copy the current saved version to the game - does not include unsaved changes',
              action: () => {
                return ger.withFlashMessageK(
                  async () => {
                    if (isNully(petzFolder))
                      return E.left('No petz folder set');
                    const res = await mainIpc.exportCurrentToGame(
                      petzFolder,
                      projectId,
                      false
                    );
                    if (E.isRight(res)) {
                      if (isString(res.right)) {
                        overwriteModalNode.setValue(false);
                        return res;
                      }
                      if (isString(res.right.alreadyExists)) {
                        onContinueNode.setValue({
                          filePath: res.right.alreadyExists,
                          continue: () => {
                            ger.withFlashMessageK(async () => {
                              if (isNully(petzFolder))
                                return E.left('No petz folder set');
                              const res2 = await mainIpc.exportCurrentToGame(
                                petzFolder,
                                projectId,
                                true
                              );
                              if (E.isRight(res2)) {
                                if (isString(res2.right)) {
                                  overwriteModalNode.setValue(false);
                                  onContinueNode.setValue(null);
                                  return res2;
                                }
                                return E.left('Failed unexpectedly!');
                              }
                              return res2;
                            });
                          }
                        });
                        overwriteModalNode.setValue(true);
                      }
                    }
                    return res;
                  },
                  { successOnlyOnString: true }
                );
              }
            });
          }
        });

        return <ActionBar actions={actionsNode} />;
      }}
    />;
  );
}

const SectionPage = ({
  fileInfo,
  entryIdQuery,
  sectionName,
}: NavigationDeps & {
  entryIdQuery: ResourceEntryIdQuery;
  sectionName: ResourceDataSectionName;
}) => {
  const entWithIdM = getResourceEntryById(fileInfo.resDirTable, entryIdQuery);
  const asEither = E.fromNullable('Section not found')(entWithIdM);

  return renderResult(asEither, (entWithId) => {
    const stringKey = resourceEntryIdToStringKey(entWithId.id);
    const node = fileInfo.sectionAsStringMap.get(stringKey);
    if (isNully(node)) {
      return <div>Expected to find edit node for section key {stringKey}</div>;
    }
    const sectionType = resourceDataSections[sectionName].type;
    return (
      <>
        <h2>Editing section {resourceEntryIdToStringKey(entWithId.id)}</h2>
        {run(() => {
          switch (sectionType) {
            case 'ascii':
              return (
                <div className={style.editorTextAreaWrapper}>
                  <CodeMirror valueNode={node.editNode} />
                </div>
              );
            case 'bitmap': {
              const bmpData = bmp.decode(node.data);
              // console.log(bmpData);
              const dataToMod = bmpData.data;
              for (let row = 0; row < bmpData.height; row++) {
                for (let col = 0; col < bmpData.width; col++) {
                  const idx = row * bmpData.width * 4 + col * 4;
                  dataToMod[idx] = 255;
                }
              }
              const encoded = bmp.encode({
                data: bmpData.data,
                bitPP: 8,
                width: bmpData.width,
                height: bmpData.height,
                palette: bmpData.palette,
                hr: bmpData.hr,
                vr: bmpData.vr,
                colors: bmpData.colors,
                importantColors: bmpData.importantColors,
              });
              const _bitMapP = createImageBitmap(new Blob([encoded.data]));

              return (
                <div className={style.previewImageWrapper}>
                  <img
                    src={`data:image/bmp;base64,${btoa(
                      bytesToString(node.data)
                    )}`}
                  />
                  <img
                    src={`data:image/bmp;base64,${btoa(
                      bytesToString(encoded.data)
                    )}`}
                  />
                </div>
              );
            }
            default: {
              return isNever(sectionType);
            }
          }
        })}
      </>
    );
  });
};

const useOverwriteModal = (
  onContinueNode: ReactiveVal<null | OverwriteModalOpts>
) => {
  return useModal({
    Content: (props) => (
      <FileExistsModal onContinueNode={onContinueNode} {...props.modalProps} />
    ),
    closable: true,
  });
};

export function FileExistsModal({
  closeModal,
  onContinueNode,
}: ModalContentProps & {
  onContinueNode: ReactiveVal<null | OverwriteModalOpts>;
}) {
  const mainIpc = useMainIpc();
  const onContinue = useReactiveVal(onContinueNode);
  if (isNully(onContinue)) {
    return null;
  }
  return (
    <Panel>
      <PanelHeader>File Already Exists</PanelHeader>
      <PanelBody>
        The file {onContinue.filePath} already exists, would you like to
        overwrite it?
      </PanelBody>
      <PanelButtons>
        <Button label="Cancel" onClick={closeModal} />
        <Button
          label="Open Folder"
          onClick={() => {
            mainIpc.openFileInExplorer(onContinue.filePath);
          }}
        />

        <Button label="Continue" onClick={onContinue.continue} />
      </PanelButtons>
    </Panel>
  );
}

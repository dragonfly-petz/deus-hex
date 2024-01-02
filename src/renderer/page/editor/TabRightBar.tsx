import { isString } from 'fp-ts/string';
import { TabDefs } from './get-deps';
import { useMainIpc, useUserSetting } from '../../context/context';
import {
  sequenceReactiveArray,
  useMkReactiveNodeMemo,
} from '../../reactive-state/reactive-hooks';
import { isNotNully, isNully, nullable } from '../../../common/null';
import { RenderQuery } from '../../framework/Query';
import { identity } from '../../../common/function';
import { ActionBar, useAddActions } from '../../layout/ActionBar';
import { E, O } from '../../../common/fp-ts/fp';
import { ger } from '../../../common/error';

import { OverwriteModalOpts, useOverwriteModal } from './modals';

export function TabRightBar({
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
        const sections = Array.from(value.sectionDataNodes.values()).map(
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
            },
          });

          if (isNotNully(projectId)) {
            actions.push({
              label: 'Save Backup',
              icon: 'faSave',
              key: 'saveBackup',
              tooltip:
                "Save the current changes as a backup file but don't save them to the current file'",
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
              },
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
                          },
                        });
                        overwriteModalNode.setValue(true);
                      }
                    }
                    return res;
                  },
                  { successOnlyOnString: true }
                );
              },
            });
          }
        });

        return <ActionBar actions={actionsNode} />;
      }}
    />
  );
}

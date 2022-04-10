import { useMemo } from 'react';
import style from './PetzResources.module.scss';
import {
  useAppHelper,
  useAppReactiveNodes,
  useMainIpc,
  useUserSetting,
} from '../context/context';
import { RenderQuery, useMkQueryMemo } from '../framework/Query';
import {
  useListenReactiveVal,
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../reactive-state/reactive-hooks';
import type { ResourcesInfo } from '../../main/app/resource/resource-manager';
import {
  ResourceFolderInfo,
  ResourceInfoWithPath,
} from '../../main/app/resource/resource-manager';
import { DropFile } from '../framework/form/DropFile';
import { Button } from '../framework/Button';
import { isNotNully, isNully, nullable } from '../../common/null';
import type { TabDef } from '../layout/Tabs';
import { ActionBar, ActionsNode, useAddActions } from '../layout/ActionBar';
import { throwRejection, throwRejectionK } from '../../common/promise';
import { Panel, PanelBody, PanelButtons, PanelHeader } from '../layout/Panel';
import { ger } from '../../common/error';
import {
  ModalableProps,
  ModalContentProps,
  useModal,
} from '../framework/Modal';
import { E } from '../../common/fp-ts/fp';
import { unsafeObjectEntries } from '../../common/object';
import { FileType, fileTypesValues } from '../../common/petz/file-types';
import { renderResult } from '../framework/result';
import { Icon, IconDef } from '../framework/Icon';
import { globalSh, GlobalStyleVarName } from '../framework/global-style-var';
import { classNames } from '../../common/react';
import { getAndModifyOrPut } from '../../common/map';
import { Navigation, NavigationDef } from '../layout/NavgationBar';
import { renderEither, renderNullable } from '../framework/render';
import { eitherToNullable } from '../../common/fp-ts/either';
import {
  FormError,
  FormInput,
  FormItem,
  FormLabel,
  FormWarning,
} from '../framework/form/form';
import { TextInput } from '../framework/form/TextInput';

const navigationNames = ['overview', 'catz', 'dogz', 'clothes'] as const;
export type ResourcesPage = typeof navigationNames[number];

interface NavigationDeps {
  resourcesInfo: ResourcesInfo;
  actionsNode: ActionsNode;
  // eslint-disable-next-line react/no-unused-prop-types
  resourcesOverviewQuery: TabDeps['resourcesOverviewQuery'];
  navigation: NavigationDef<ResourcesPage, NavigationDeps>;
}

type NavigationDefResources = NavigationDef<ResourcesPage, NavigationDeps>;
const useMkNavigation = (): NavigationDefResources => {
  const node = useAppReactiveNodes().currentResourcesPage;
  return {
    names: navigationNames,
    node,
    items: {
      overview: {
        name: 'Overview',
        Content: OverviewPage,
      },
      catz: {
        name: 'Catz',
        Content: (props) => <SpecificPage type="catz" {...props} />,
      },
      dogz: {
        name: 'Dogz',
        Content: (props) => <SpecificPage type="dogz" {...props} />,
      },
      clothes: {
        name: 'Clothes',
        Content: (props) => <SpecificPage type="clothes" {...props} />,
      },
    },
  };
};

function useGetDeps() {
  const mainIpc = useMainIpc();

  const navigation = useMkNavigation();
  const resourcesOverviewQuery = useMkQueryMemo(() =>
    mainIpc.getResourcesInfo()
  );
  const actionsNode: ActionsNode = useMkReactiveNodeMemo(new Map());
  return { navigation, resourcesOverviewQuery, actionsNode };
}

type TabDeps = ReturnType<typeof useGetDeps>;

export function mkPetzResourcesTab(): TabDef<TabDeps> {
  return {
    tabName: 'Petz Resources',
    useGetDeps,
    TabContent: PetzResources,
    TabRightBar,
    TabLeftBar,
  };
}

export const PetzResources = ({
  resourcesOverviewQuery,
  navigation,
  actionsNode,
}: TabDeps) => {
  const { userSettingsRemote } = useAppReactiveNodes();

  useListenReactiveVal(
    userSettingsRemote.fmapStrict((it) => it.petzFolder),
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
          const currentPage = useReactiveVal(navigation.node);
          const { Content } = navigation.items[currentPage];
          return (
            <Content
              resourcesInfo={value}
              actionsNode={actionsNode}
              resourcesOverviewQuery={resourcesOverviewQuery}
              navigation={navigation}
            />
          );
        }}
        AdditionalOnError={() => <PetzFolderForm modalProps={null} />}
      />
    </div>
  );
};
const TabLeftBar = ({ navigation }: TabDeps) => {
  return (
    <Navigation
      navigationNames={navigation.names}
      items={navigation.items}
      node={navigation.node}
      labelDeps={{}}
    />
  );
};

const TabRightBar = ({ actionsNode, resourcesOverviewQuery }: TabDeps) => {
  useAddActions(actionsNode, (actions) => {
    actions.push({
      label: 'Refresh',
      icon: 'faSync',
      key: 'refresh',
      tooltip: 'Refresh all info',
      action: () => {
        return resourcesOverviewQuery.reload();
      },
    });
  });
  return <ActionBar actions={actionsNode} />;
};
const PetzFolderForm = ({ modalProps }: ModalableProps) => {
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
            modalProps?.closeModal();
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
const OverviewPage = ({
  resourcesInfo,
  actionsNode,
  navigation,
}: NavigationDeps) => {
  const { userSettingsRemote } = useAppReactiveNodes();
  const changePetzFolderModal = useModal({ Content: PetzFolderForm });
  useAddActions(actionsNode, (actions) => {
    actions.push({
      label: 'Reset Petz Folder',
      icon: 'faEraser',
      key: 'clearPetzFolder',
      tooltip: 'Unsets your saved petz folder setting',
      action: () =>
        ger.withFlashMessage(
          userSettingsRemote.setRemotePartial({ petzFolder: null })
        ),
    });
    actions.push({
      label: 'Change Petz Folder',
      icon: 'faPencil',
      key: 'changePetzFolder',
      tooltip: 'Change your saved petz folder setting',
      action: async () => {
        changePetzFolderModal.setValue(true);
        return E.right(null);
      },
    });
  });
  const petzFolder = useUserSetting('petzFolder');
  return (
    <>
      <h2>Folder: {petzFolder}</h2>
      <div className={style.foldersOverview}>
        {unsafeObjectEntries(resourcesInfo).map(([k, finfo]) => (
          <FolderOverview
            key={k}
            folderInfo={finfo}
            type={k}
            navigation={navigation}
          />
        ))}
      </div>
    </>
  );
};

type DuplicatesMap = ReturnType<typeof getDuplicatesMap>;

function getDuplicatesMap(arr: ResourceInfoWithPath[]) {
  const map = new Map<number, Array<ResourceInfoWithPath>>();
  for (const info of arr) {
    if (E.isRight(info.info)) {
      getAndModifyOrPut(
        map,
        info.info.right.value.rcInfo.breedId,
        (it) => {
          it.push(info);
          return it;
        },
        () => new Array(info)
      );
    }
  }
  return map;
}

const FolderOverview = ({
  folderInfo,
  type,
  navigation,
}: {
  folderInfo: ResourceFolderInfo;
  type: FileType;
  navigation: NavigationDefResources;
}) => {
  return (
    <div className={style.folderOverview}>
      <div className={style.folderTypeAndSummary}>
        <div className={style.folderType}>{type}</div>
        {renderResult(folderInfo, ({ fileInfos }) => {
          const validFiles = fileInfos.filter((it) =>
            E.isRight(it.info)
          ).length;
          const invalidFiles = fileInfos.filter(
            (it) => E.isLeft(it.info) && it.info.left.tag === 'error'
          ).length;
          const invalidPaths = fileInfos.filter(
            (it) => E.isLeft(it.info) && it.info.left.tag === 'invalidPath'
          ).length;
          const duplicatesMap = getDuplicatesMap(fileInfos);
          const duplicates = Array.from(duplicatesMap).filter(
            (it) => it[1].length > 1
          );

          return (
            <>
              <div className={style.summary}>
                <SummaryRow
                  label="Valid"
                  number={validFiles}
                  icon="faCheck"
                  color="successFgColor"
                />
                <SummaryRow
                  label="Errors"
                  number={invalidFiles}
                  icon="faExclamationTriangle"
                  color="errorFgColor"
                />
                <SummaryRow
                  label="Other"
                  number={invalidPaths}
                  icon="faInfoCircle"
                  color="infoFgColor"
                />
              </div>
              <div className={style.summary}>
                <SummaryRow
                  label="Duplicate ids"
                  number={duplicates.length}
                  icon="faExclamationTriangle"
                  color="errorFgColor"
                />
              </div>
            </>
          );
        })}
      </div>
      {renderNullable(eitherToNullable(folderInfo), (info) => (
        <div className={style.folderOverviewPath}>{info.path}</div>
      ))}
      <Button
        onClick={() => {
          navigation.node.setValue(type);
        }}
        label="Go to section"
      />
    </div>
  );
};

const SummaryRow = ({
  label,
  number,
  icon,
  color,
}: {
  label: string;
  number: number;
  icon: IconDef;
  color: GlobalStyleVarName;
}) => {
  return (
    <div
      style={globalSh.toProxyStyle({
        localVar1: color,
      })}
      className={classNames(
        style.summaryRow,
        number > 0 ? style.hasNumber : null
      )}
    >
      <div className={style.summaryIcon}>
        <Icon icon={icon} />
      </div>
      <div className={style.summaryLabel}>{label}</div>
      <div className={style.summaryCount}>{number}</div>
    </div>
  );
};

const SpecificPage = ({
  resourcesInfo,
  type,
  actionsNode,
  resourcesOverviewQuery,
}: NavigationDeps & { type: FileType }) => {
  const typeInfoR = resourcesInfo[type];
  return renderResult(typeInfoR, ({ fileInfos, path }) => {
    const validFiles = fileInfos.filter((it) => E.isRight(it.info));
    const invalidFiles = fileInfos.filter(
      (it) => E.isLeft(it.info) && it.info.left.tag === 'error'
    );
    const invalidPaths = fileInfos.filter(
      (it) => E.isLeft(it.info) && it.info.left.tag === 'invalidPath'
    );
    const duplicatesMap = getDuplicatesMap(fileInfos);
    const duplicates = Array.from(duplicatesMap).filter(
      (it) => it[1].length > 1
    );
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const mainIpc = useMainIpc();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAddActions(actionsNode, (actions) => {
      if (duplicates.length > 0) {
        actions.push({
          label: 'Fix duplicate ids',
          key: 'fixDuplicateIds',
          tooltip:
            'This will update ids where necessary to ensure there are no duplicates',
          action: async () => {
            await ger.withFlashMessage(mainIpc.fixDuplicateIds(type));
            return resourcesOverviewQuery.reload();
          },
        });
      }
    });
    return (
      <>
        <h2>Folder: {path}</h2>
        <FilesList
          infos={invalidFiles}
          title="Error files"
          resourcesOverviewQuery={resourcesOverviewQuery}
          type={type}
        />
        {duplicates.map(([id, infos]) => {
          return (
            <FilesList
              key={id}
              infos={infos}
              title={`Duplicates with id ${id}`}
              resourcesOverviewQuery={resourcesOverviewQuery}
              duplicates={duplicatesMap}
              type={type}
            />
          );
        })}
        <FilesList
          infos={validFiles}
          title="Valid files"
          resourcesOverviewQuery={resourcesOverviewQuery}
          duplicates={duplicatesMap}
          type={type}
        />
        <FilesList
          infos={invalidPaths}
          title="Other files"
          resourcesOverviewQuery={resourcesOverviewQuery}
          type={type}
        />
      </>
    );
  });
};

const FilesList = ({
  infos,
  title,
  resourcesOverviewQuery,
  duplicates,
  type,
}: {
  infos: ResourceInfoWithPath[];
  title: string;
  resourcesOverviewQuery: TabDeps['resourcesOverviewQuery'];
  duplicates?: DuplicatesMap;
  type: FileType;
}) => {
  if (infos.length < 1) return null;
  return (
    <div className={style.filesList}>
      <h2>{title}</h2>
      <div className={style.list}>
        {infos.map((it) => (
          <FileInfo
            key={it.path}
            info={it}
            resourcesOverviewQuery={resourcesOverviewQuery}
            duplicates={duplicates}
            type={type}
          />
        ))}
      </div>
    </div>
  );
};

const FileInfo = ({
  info,
  duplicates,
  resourcesOverviewQuery,
  type,
}: {
  info: ResourceInfoWithPath;
  resourcesOverviewQuery: TabDeps['resourcesOverviewQuery'];
  duplicates?: DuplicatesMap;
  type: FileType;
}) => {
  const appHelper = useAppHelper();
  const changePetzFolderModalNode = useModal({
    Content: ({ modalProps }) => {
      return renderNullable(duplicates, (dups) => {
        return (
          <NewIdForm
            resourcesOverviewQuery={resourcesOverviewQuery}
            info={info}
            type={type}
            duplicates={dups}
            {...modalProps}
          />
        );
      });
    },
  });

  return (
    <div className={style.fileInfo}>
      <div className={style.infoRow}>
        <div className={style.infoFileName}>{info.fileName}</div>
        {renderEither(
          info.info,
          (err) => (
            <div className={style.infoInvalid}>{err.value}</div>
          ),
          (inf) => {
            const { rcInfo } = inf.value;
            return (
              <>
                <div className={style.id}>{rcInfo.breedId}</div>
                <div className={style.displayName}>{rcInfo.displayName}</div>
                <div className={style.spriteName}>{rcInfo.spriteName}</div>
                <div className={style.buttons}>
                  <Button
                    onClick={() => {
                      throwRejectionK(async () => {
                        return appHelper.openEditorWithFile(inf.value.filePath);
                      });
                    }}
                    label="Open Editor"
                  />
                  {renderNullable(duplicates, () => {
                    return (
                      <Button
                        onClick={() => {
                          changePetzFolderModalNode.setValue(true);
                        }}
                        label="Assign New Id"
                      />
                    );
                  })}
                </div>
              </>
            );
          }
        )}
      </div>
    </div>
  );
};

export const NewIdForm = ({
  closeModal,
  info,
  resourcesOverviewQuery,
  duplicates,
  type,
}: ModalContentProps & {
  info: ResourceInfoWithPath;
  duplicates: DuplicatesMap;
  resourcesOverviewQuery: TabDeps['resourcesOverviewQuery'];
  type: FileType;
}) => {
  const newIdNode = useMkReactiveNodeMemo('');
  const validNewId = useMemo(
    () =>
      newIdNode.fmapStrict((it) => {
        const val = parseInt(it, 10);
        if (Number.isNaN(val)) {
          return E.left(`"${it}" could not be parsed to an integer`);
        }
        return E.right(val);
      }),
    [newIdNode]
  );
  const idWarning = validNewId.fmapStrict((it) => {
    if (E.isLeft(it)) return null;
    const existing = duplicates.get(it.right);
    if (isNotNully(existing))
      return `This id overlaps with ${existing
        .map((inf) => inf.fileName)
        .join(', ')}`;
    const overlapVanilla = fileTypesValues.find((ft) => {
      return ft.vanillaIds.includes(it.right);
    });
    if (isNotNully(overlapVanilla)) {
      return `This id overlaps with a vanilla id for ${overlapVanilla.name}`;
    }
    return null;
  });
  const validId = useReactiveVal(validNewId);
  const mainIpc = useMainIpc();
  return (
    <Panel>
      <PanelHeader>Assign New Id</PanelHeader>
      <PanelBody>
        <FormItem>
          <>
            <FormLabel>New Id</FormLabel>
            <FormInput>
              <TextInput valueNode={newIdNode} />
            </FormInput>
            <FormError message={validNewId} />
            <FormWarning message={idWarning} />
          </>
        </FormItem>
      </PanelBody>
      <PanelButtons>
        <Button
          label="Assign Any Unused Id"
          onClick={() => {
            throwRejectionK(async () => {
              const res = await ger.withFlashMessage(
                mainIpc.assignNewId(info.path, type, null)
              );
              if (E.isRight(res)) {
                closeModal();
                resourcesOverviewQuery.reload();
              }
            });
          }}
        />
        <Button
          label={
            E.isRight(validId)
              ? `Assign ${validId.right}`
              : `New Id is not valid`
          }
          disable={E.isLeft(validId) ? 'New id is not valid' : undefined}
          onClick={() => {
            if (E.isLeft(validId)) return;
            throwRejectionK(async () => {
              const res = await ger.withFlashMessage(
                mainIpc.assignNewId(info.path, type, validId.right)
              );
              if (E.isRight(res)) {
                closeModal();
                resourcesOverviewQuery.reload();
              }
            });
          }}
        />
      </PanelButtons>
    </Panel>
  );
};

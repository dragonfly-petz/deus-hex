import style from './PetzResources.module.scss';
import {
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
import { isNully, nullable } from '../../common/null';
import type { TabDef } from '../layout/Tabs';
import { ActionBar, ActionsNode, useAddActions } from '../layout/ActionBar';
import { throwRejection, throwRejectionK } from '../../common/promise';
import { Panel, PanelBody, PanelButtons, PanelHeader } from '../layout/Panel';
import { ger } from '../../common/error';
import { ModalableProps, useModal } from '../framework/Modal';
import { E } from '../../common/fp-ts/fp';
import { unsafeObjectEntries } from '../../common/object';
import { FileType } from '../../common/petz/file-types';
import { renderResult } from '../framework/result';
import { Icon, IconDef } from '../framework/Icon';
import { globalSh, GlobalStyleVarName } from '../framework/global-style-var';
import { classNames } from '../../common/react';
import { getAndModifyOrPut } from '../../common/map';
import { Navigation, NavigationDef } from '../layout/NavgationBar';
import { renderEither, renderNullable } from '../framework/render';
import { eitherToNullable } from '../../common/fp-ts/either';

const navigationNames = ['overview', 'catz', 'dogz', 'clothes'] as const;
export type ResourcesPage = typeof navigationNames[number];

interface NavigationDeps {
  resourcesInfo: ResourcesInfo;
  actionsNode: ActionsNode;
  // eslint-disable-next-line react/no-unused-prop-types
  resourcesOverviewQuery: TabDeps['resourcesOverviewQuery'];
}

const useMkNavigation = (): NavigationDef<ResourcesPage, NavigationDeps> => {
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
          const currentPage = useReactiveVal(navigation.node);
          const { Content } = navigation.items[currentPage];
          return (
            <Content
              resourcesInfo={value}
              actionsNode={actionsNode}
              resourcesOverviewQuery={resourcesOverviewQuery}
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
const OverviewPage = ({ resourcesInfo, actionsNode }: NavigationDeps) => {
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
          <FolderOverview key={k} folderInfo={finfo} type={k} />
        ))}
      </div>
    </>
  );
};

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
}: {
  folderInfo: ResourceFolderInfo;
  type: FileType;
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
        <FilesList infos={invalidFiles} title="Error files" />
        {duplicates.map(([id, infos]) => {
          return (
            <FilesList
              key={id}
              infos={infos}
              title={`Duplicates with id ${id}`}
            />
          );
        })}
        <FilesList infos={validFiles} title="Valid files" />
        <FilesList infos={invalidPaths} title="Other files" />
      </>
    );
  });
};

const FilesList = ({
  infos,
  title,
}: {
  infos: ResourceInfoWithPath[];
  title: string;
}) => {
  if (infos.length < 1) return null;
  return (
    <div className={style.filesList}>
      <h2>{title}</h2>
      <div className={style.list}>
        {infos.map((it) => (
          <FileInfo key={it.path} info={it} />
        ))}
      </div>
    </div>
  );
};

const FileInfo = ({ info }: { info: ResourceInfoWithPath }) => {
  const mainIpc = useMainIpc();
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
                        return ger.withFlashMessage(
                          mainIpc.openEditor(inf.value.filePath)
                        );
                      });
                    }}
                    label="Open Editor"
                  />
                </div>
              </>
            );
          }
        )}
      </div>
    </div>
  );
};

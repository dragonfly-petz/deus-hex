import { ReactNode } from 'react';
import { NavigationDeps, TabDefs } from './get-deps';
import { useAppReactiveNodes, useMainIpc } from '../../context/context';
import { isNotNully, isNully } from '../../../common/null';
import { QueryInner, RenderQuery } from '../../framework/Query';
import { E } from '../../../common/fp-ts/fp';
import { ger } from '../../../common/error';
import { ProjectId } from '../../../main/app/resource/project-manager';
import style from '../Editor.module.scss';
import { renderId } from '../../helper/helper';
import { renderNullable } from '../../framework/render';
import { renderResult } from '../../framework/result';
import { sortByNumeric } from '../../../common/array';
import { formatDateDistance } from '../../../common/df';
import { Button } from '../../framework/Button';
import { throwRejectionK } from '../../../common/promise';
import { Navigation } from '../../layout/NavigationBar';
import { getSectionDataNodes } from './SectionPage';
import { ResourceDataSectionName } from '../../../common/petz/file-types';
import { WithReactiveVal } from '../../reactive-state/reactive-components';

type FileInfoQueryResult = QueryInner<TabDefs['fileInfoQuery']>;

export function TabLeftBar(deps: TabDefs) {
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
              SuffixItem={SubMenu}
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

function SubMenu({
  name,
  currentName,
  fileInfo,
}: TabDefs & {
  name: ResourceDataSectionName;
  currentName: ResourceDataSectionName;
  fileInfo: NavigationDeps['fileInfo'];
}) {
  if (name !== currentName) return null;
  const nodes = getSectionDataNodes(fileInfo, name);
  if (E.isLeft(nodes)) return null;
  const { dataNodes } = nodes.right;
  return (
    <WithReactiveVal
      node={dataNodes.parsedData}
      render={({ value }) => {
        const { editorScrollSignal } = useAppReactiveNodes();

        if (E.isLeft(value)) return null;
        return (
          <div className={style.tabLeftLnzSections}>
            {value.right.structured
              .map((sectRow, idx) => {
                if (sectRow.tag !== 'section') return null;

                return (
                  <Button
                    key={idx + sectRow.sectionName}
                    label={sectRow.sectionName}
                    onClick={() => {
                      if (isNully(sectRow.lineIndex)) return;
                      editorScrollSignal.setValue({
                        toLine: sectRow.lineIndex + 1,
                      });
                    }}
                    size="small"
                  />
                );
              })
              .filter(isNotNully)}
          </div>
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

import bmp from '@wokwi/bmp-ts';
import { pipe } from 'fp-ts/function';
import {
  mkResourceDataSections,
  ResourceDataSectionName,
} from '../../../common/petz/file-types';
import {
  getSingleResourceEntryById,
  ResourceEntryId,
  resourceEntryIdToStringKey,
} from '../../../common/petz/codecs/rsrc-utility';
import { E } from '../../../common/fp-ts/fp';
import { renderResult } from '../../framework/result';
import { isNully } from '../../../common/null';
import { renderReactive } from '../../reactive-state/render-reactive';
import { run } from '../../../common/function';
import style from '../Editor.module.scss';
import { CodeMirror } from '../../editor/CodeMirror';
import { bytesToString } from '../../../common/buffer';
import { isNever } from '../../../common/type-assertion';
import type { NavigationDeps } from './get-deps';
import { ReactiveNode } from '../../../common/reactive/reactive-node';
import { ReactiveVal } from '../../../common/reactive/reactive-interface';
import { ParsedLnzResult } from '../../../common/petz/parser/main';
import { useAppReactiveNodes } from '../../context/context';

export interface SectionDataNodes {
  data: Uint8Array;
  original: string;
  // nasty hack to get around recreating the hasChanged node
  originalHolder: { original: string };
  editNode: ReactiveNode<string>;
  parsedData: ReactiveVal<ParsedLnzResult>;
  isParsing: ReactiveVal<boolean>;
  hasChanged: ReactiveVal<boolean>;
  id: ResourceEntryId;
}

export function getSectionDataNodes(
  fileInfo: NavigationDeps['fileInfo'],
  sectionName: ResourceDataSectionName
) {
  const resourceDataSections = mkResourceDataSections(
    fileInfo.rcDataAndEntry.rcData
  );
  const entryIdQuery = resourceDataSections[sectionName].idMatcher;

  const entWithIdM = getSingleResourceEntryById(
    fileInfo.resDirTable,
    entryIdQuery
  );
  const asEither = E.fromNullable('Section not found')(entWithIdM);
  return pipe(
    asEither,
    E.chain((entWithId) => {
      const stringKey = resourceEntryIdToStringKey(entWithId.id);
      const node = fileInfo.sectionDataNodes.get(stringKey);
      if (isNully(node)) {
        return E.left(
          `Expected to find data nodes for section key ${stringKey}`
        );
      }
      return E.of({
        dataNodes: node,
        sectionType: resourceDataSections[sectionName].type,
      });
    })
  );
}

export const SectionPage = ({
  fileInfo,
  sectionName,
}: NavigationDeps & {
  sectionName: ResourceDataSectionName;
}) => {
  const { userSettingsRemote } = useAppReactiveNodes();

  const dataNodesE = getSectionDataNodes(fileInfo, sectionName);
  return renderResult(dataNodesE, ({ dataNodes, sectionType }) => {
    return (
      <>
        <h2>
          Editing section {resourceEntryIdToStringKey(dataNodes.id)}{' '}
          {renderReactive(dataNodes.isParsing, (it) =>
            it ? <>Parsing...</> : null
          )}
          <button
            onClick={() => {
              userSettingsRemote.setRemotePartialFn((it) => ({
                showLineNumbers: !it.showLineNumbers,
              }));
            }}
          >
            Toggle line numbers
          </button>
        </h2>
        {run(() => {
          switch (sectionType) {
            case 'ascii':
              return (
                <div className={style.editorTextAreaWrapper}>
                  <CodeMirror
                    valueNode={dataNodes.editNode}
                    parsedData={dataNodes.parsedData}
                  />
                </div>
              );
            case 'bitmap': {
              const bmpData = bmp.decode(dataNodes.data);
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
                      bytesToString(dataNodes.data)
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

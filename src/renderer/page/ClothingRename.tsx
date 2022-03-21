import style from './ClothingRename.module.scss';
import { DropFile } from '../framework/form/DropFile';
import { clothingExtension } from '../../common/petz/file-types';
import {
  useListenReactiveNode,
  useMkReactiveNodeMemo,
  useReactiveNode,
} from '../reactive-state/reactive-hooks';
import { isNully, nullable } from '../../common/null';
import { useMainIpc } from '../context/context';
import { throwRejection } from '../../common/promise';
import { renderReactiveResult } from '../framework/result';
import type {
  FileInfo,
  RenameClothingFileResult,
} from '../../main/app/pe-files/pe-files-util';
import { unsafeObjectEntries } from '../../common/object';
import { TextInput } from '../framework/form/TextInput';
import { renderIf, renderNullableElse } from '../framework/render';
import { classNames } from '../../common/react';
import { Button } from '../framework/Button';
import { isDev } from '../../main/app/util';

const debugNewFileName = isDev() ? 'Zragonl ffffff' : '';
const debugNewItemName = isDev() ? 'Zrangonlierfs' : '';
export const ClothingRename = () => {
  const pickedPathNode = useMkReactiveNodeMemo(nullable<string>());
  const newFileNameNode = useMkReactiveNodeMemo(debugNewFileName);
  const newItemNameNode = useMkReactiveNodeMemo(debugNewItemName);
  const fileInfoNode = useMkReactiveNodeMemo(nullable<FileInfo>());
  const renameResultNode = useMkReactiveNodeMemo(
    nullable<RenameClothingFileResult>()
  );
  if (isDev()) {
    setTimeout(() => {
      pickedPathNode.setValue(
        'C:\\Users\\franc\\Documents\\Petz\\Petz 4\\Resource\\Clothes\\Argyle Sweater.clo'
      );
    }, 500);
  }
  const mainIpc = useMainIpc();
  useListenReactiveNode(pickedPathNode, (it) => {
    if (isNully(it)) {
      fileInfoNode.setValue(null);
    } else {
      throwRejection(async () => {
        fileInfoNode.setValue(await mainIpc.getClothingFileInfo(it));
      });
    }
  });
  return (
    <div className={style.main}>
      <DropFile
        validExtensions={new Set([clothingExtension])}
        onChange={(it) => pickedPathNode.setValue(it)}
      />
      <Button
        label="Reset"
        onClick={() => {
          pickedPathNode.setValue(null);
          newFileNameNode.setValue('');
          newItemNameNode.setValue('');
          fileInfoNode.setValue(null);
          renameResultNode.setValue(null);
        }}
      />

      {renderReactiveResult(fileInfoNode, (output) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const newFileName = useReactiveNode(newFileNameNode);
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const newItemName = useReactiveNode(newItemNameNode);
        const oldFileName = output.pathParsed.name;
        const oldItemName = output.itemName;
        const fileNameInvalid =
          newFileName.length === oldFileName.length
            ? null
            : `File name must be same length (${oldFileName.length}) as old file name (${oldFileName}). Currently it is ${newFileName.length}`;
        const newItemNameInvalid =
          newItemName.length === oldItemName.length
            ? null
            : `Item name must be same length (${oldItemName.length}) as old file name (${oldItemName}). Currently it is ${newItemName.length}`;
        return (
          <div className={style.form}>
            <h2>File info</h2>
            {unsafeObjectEntries(output).map(([key, val]) => {
              if (key === 'pathParsed') return null;
              return (
                <div className={style.row} key={key}>
                  {key}: {val}
                </div>
              );
            })}

            <h2>New names</h2>
            <div className={style.formRow}>
              New File Name
              <div className={style.formEl}>
                <TextInput valueNode={newFileNameNode} />
              </div>
              {renderNullableElse(
                fileNameInvalid,
                (invalid) => (
                  <div className={classNames(style.validation, style.invalid)}>
                    {invalid}
                  </div>
                ),
                () => (
                  <div className={classNames(style.validation, style.valid)}>
                    Valid!
                  </div>
                )
              )}
            </div>
            <div className={style.formRow}>
              New Item Name
              <div className={style.formEl}>
                <TextInput valueNode={newItemNameNode} />
              </div>
              {renderNullableElse(
                newItemNameInvalid,
                (invalid) => (
                  <div className={classNames(style.validation, style.invalid)}>
                    {invalid}
                  </div>
                ),
                () => (
                  <div className={classNames(style.validation, style.valid)}>
                    Valid!
                  </div>
                )
              )}
            </div>
            {renderIf(
              isNully(fileNameInvalid) && isNully(newItemNameInvalid),
              () => {
                return (
                  <Button
                    label="Transform"
                    onClick={() => {
                      throwRejection(async () => {
                        const res = await mainIpc.renameClothingFile(
                          output.filePath,
                          newFileName,
                          oldItemName,
                          newItemName
                        );
                        renameResultNode.setValue(res);
                      });
                    }}
                  />
                );
              }
            )}
          </div>
        );
      })}
      {renderReactiveResult(renameResultNode, (output) => {
        return (
          <div className={style.result}>
            {renderIf(output.warnIdFailed.length > 0, () => {
              return (
                <div className={style.warn}>
                  WARNING: can't guarantee unique id as encountered errors
                  (files listed below)
                </div>
              );
            })}
            <div className={style.row}>
              File written to {output.newFilePath}
            </div>
            <div className={style.row}>New id used: {output.newId}</div>
            {Array.from(output.changes.entries()).map(([id, it]) => {
              return (
                <div className={style.row} key={id}>
                  Changed <b>{it.from}</b> to <b>{it.to}</b> in{' '}
                  <b>{it.offsets.length}</b> places.
                  <br />
                  (Offsets: {it.offsets.join(', ')})
                </div>
              );
            })}
            {renderIf(output.warnIdFailed.length > 0, () => {
              return (
                <div className={style.warn}>
                  Failed files:
                  {Array.from(output.warnIdFailed.entries()).map(
                    ([id, err]) => {
                      return <div key={id}>{err}</div>;
                    }
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

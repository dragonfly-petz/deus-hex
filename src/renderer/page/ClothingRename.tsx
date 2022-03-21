import style from './ClothingRename.module.scss';
import { DropFile } from '../framework/form/DropFile';
import { clothingExtension } from '../../common/petz/file-types';
import {
  useListenReactiveNode,
  useMkReactiveNodeMemo,
} from '../reactive-state/reactive-hooks';
import { isNully, nullable } from '../../common/null';
import { Result } from '../../common/result';
import { ClothingInfo } from '../../common/petz/files/clothing';
import { useMainIpc } from '../context/context';
import { throwRejection } from '../../common/promise';
import { renderReactiveResult } from '../framework/result';
import { Button } from '../framework/Button';

export const ClothingRename = () => {
  const pickedPathNode = useMkReactiveNodeMemo(nullable<string>());
  const fileInfoNode = useMkReactiveNodeMemo(nullable<Result<ClothingInfo>>());
  const mainIpc = useMainIpc();
  mainIpc.renameClothingFile();
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
      {renderReactiveResult(fileInfoNode, (output) => {
        return (
          <div className={style.result}>
            Current names: {output.currentNamesUsed.join(', ')}
          </div>
        );
      })}
      <Button
        label="asadfs"
        onClick={() => {
          throwRejection(async () => {
            const res = await mainIpc.renameClothingFile();
          });
        }}
      />
    </div>
  );
};

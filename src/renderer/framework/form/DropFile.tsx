import { Either } from 'fp-ts/Either';
import style from './DropFile.module.scss';
import { useMemoRef } from '../../hooks/use-memo-ref';
import { voidFn } from '../../../common/function';
import { safeHead, tuple } from '../../../common/array';
import {
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../../reactive-state/reactive-hooks';
import { classNames } from '../../../common/react';
import { isNotNully, isNully, nullable } from '../../../common/null';
import { E } from '../../../common/fp-ts/fp';
import { renderResult } from '../result';

export const DropFile = ({
  validExtensions,
  onChange,
}: {
  validExtensions: Set<string>;
  onChange: (path: string | null) => void;
}) => {
  const isOverNode = useMkReactiveNodeMemo(false);
  const isOver = useReactiveVal(isOverNode);
  const droppedFileInfoNode = useMkReactiveNodeMemo(
    nullable<Either<string, string>>()
  );
  const droppedFileInfo = useReactiveVal(droppedFileInfoNode);

  const { refSetter } = useMemoRef((div: HTMLDivElement) => {
    div.addEventListener('dragover', (ev) => {
      // this allows drop
      // https://stackoverflow.com/questions/36548805/adding-eventlistener-for-file-drop
      ev.preventDefault();
    });
    div.addEventListener('dragenter', () => {
      isOverNode.setValue(true);
    });
    div.addEventListener('dragleave', () => {
      isOverNode.setValue(false);
    });
    div.addEventListener('drop', (ev) => {
      const paths = new Array<string>();
      for (const file of ev.dataTransfer?.files ?? []) {
        paths.push(file.path);
      }
      const filter = paths.filter((it) => {
        const extSplit = it.split('.');
        const ext = extSplit.length > 1 ? extSplit.pop() : null;
        const extWithDot = isNotNully(ext) ? `.${ext}` : '';
        return validExtensions.has(extWithDot);
      });
      const pickedPath = safeHead(filter);
      if (isNully(pickedPath)) {
        onChange(null);
        droppedFileInfoNode.setValue(
          E.left(
            `No valid files dropped: expected file with extension ${Array.from(
              validExtensions
            ).join(' ,')}`
          )
        );
      } else {
        onChange(pickedPath);
        droppedFileInfoNode.setValue(E.right(pickedPath));
      }
    });
    return tuple(undefined, voidFn);
  });

  return (
    <div className={style.dropFileWrapper}>
      <div
        ref={refSetter}
        className={classNames(style.dropFile, isOver ? style.isOver : null)}
      >
        Drop file here
      </div>
      {renderResult(droppedFileInfo, (output) => {
        return <div className={style.currentFile}>Selected file: {output}</div>;
      })}
    </div>
  );
};

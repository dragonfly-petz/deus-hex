import { Either } from 'fp-ts/Either';
import { useEffect } from 'react';
import style from './DropFile.module.scss';
import { useMemoRef } from '../../hooks/use-memo-ref';
import { identity, voidFn } from '../../../common/function';
import { safeHead, tuple } from '../../../common/array';
import {
  useListenReactiveVal,
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../../reactive-state/reactive-hooks';
import { classNames } from '../../../common/react';
import { isNotNully, isNully, nullable } from '../../../common/null';
import { E } from '../../../common/fp-ts/fp';
import { renderResult } from '../result';
import { ReactiveNode } from '../../../common/reactive/reactive-node';

export const DropFile = ({
  validExtensions,
  valueNode,
}: {
  validExtensions: Set<string>;
  valueNode: ReactiveNode<string | null>;
}) => {
  const dragEnterCounterNode = useMkReactiveNodeMemo(0);
  const isOver = useReactiveVal(
    dragEnterCounterNode.fmap.strict((it) => it > 0)
  );
  const droppedFileInfoNode = useMkReactiveNodeMemo(
    nullable<Either<string, string>>()
  );
  const setFromValueNode = (val: string | null) => {
    if (isNully(val)) {
      droppedFileInfoNode.setValue(null);
    } else {
      droppedFileInfoNode.setValue(E.right(val));
    }
  };
  useEffect(() => {
    setFromValueNode(valueNode.getValue());
  }, [valueNode]);

  useListenReactiveVal(valueNode.fmap.strict(identity), setFromValueNode);

  const droppedFileInfo = useReactiveVal(droppedFileInfoNode);

  const { refSetter } = useMemoRef((div: HTMLDivElement) => {
    div.addEventListener('dragover', (ev) => {
      // this allows drop
      // https://stackoverflow.com/questions/36548805/adding-eventlistener-for-file-drop
      ev.preventDefault();
    });
    div.addEventListener('dragenter', () => {
      dragEnterCounterNode.setValueFn((it) => it + 1);
    });
    div.addEventListener('dragleave', () => {
      dragEnterCounterNode.setValueFn((it) => it - 1);
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
        valueNode.setValue(null);
        droppedFileInfoNode.setValue(
          E.left(
            `No valid files dropped: expected file with extension ${Array.from(
              validExtensions
            ).join(' ,')}`
          )
        );
      } else {
        valueNode.setValue(pickedPath);
        droppedFileInfoNode.setValue(E.right(pickedPath));
      }
    });
    return tuple(undefined, voidFn);
  });
  const extensions = Array.from(validExtensions).map((it) =>
    it === '' ? 'Directory' : it
  );
  return (
    <div className={style.dropFileWrapper}>
      <div
        ref={refSetter}
        className={classNames(style.dropFile, isOver ? style.isOver : null)}
      >
        {renderResult(droppedFileInfo, (output) => {
          return (
            <div className={style.currentFile}>Selected file: {output}</div>
          );
        })}
        <div className={style.instruction}>
          Drop file/folder here. Accepted file types: {extensions.join(', ')}
        </div>
      </div>
    </div>
  );
};

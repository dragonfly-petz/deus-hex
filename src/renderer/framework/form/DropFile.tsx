import { Either } from 'fp-ts/Either';
import { useCallback, useEffect } from 'react';
import style from './DropFile.module.scss';
import { useMemoRef } from '../../hooks/use-memo-ref';
import { identity } from '../../../common/function';
import { safeHead, tuple } from '../../../common/array';
import {
  useListenReactiveVal,
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../../reactive-state/reactive-hooks';
import { addEventListener, classNames } from '../../../common/react';
import { isNotNully, isNully, nullable } from '../../../common/null';
import { E } from '../../../common/fp-ts/fp';
import { renderResult } from '../result';
import { ReactiveNode } from '../../../common/reactive/reactive-node';
import { useAppReactiveNodes } from '../../context/context';
import { Disposer, sequenceDisposers } from '../../../common/disposable';

export function DropFile({
  validExtensions,
  valueNode,
}: {
  validExtensions: Set<string>;
  valueNode: ReactiveNode<string | null>;
}) {
  const dropFileHasDragNode = useAppReactiveNodes().dropFileHasDrag;

  const dragEnterCounterNode = useMkReactiveNodeMemo(0);
  const isOverNode = dragEnterCounterNode.fmapStrict((it) => it > 0);
  const isOver = useReactiveVal(isOverNode);
  useListenReactiveVal(isOverNode, (it) => {
    dropFileHasDragNode.setValue(it);
  });
  const droppedFileInfoNode = useMkReactiveNodeMemo(
    nullable<Either<string, string>>()
  );
  const setFromValueNode = useCallback(
    (val: string | null) => {
      if (isNully(val)) {
        droppedFileInfoNode.setValue(null);
      } else {
        droppedFileInfoNode.setValue(E.right(val));
      }
    },
    [droppedFileInfoNode]
  );
  useEffect(() => {
    setFromValueNode(valueNode.getValue());
  }, [valueNode, setFromValueNode]);

  useListenReactiveVal(valueNode.fmapStrict(identity), setFromValueNode);

  const droppedFileInfo = useReactiveVal(droppedFileInfoNode);

  const { refSetter } = useMemoRef((div: HTMLDivElement) => {
    const disposers = new Array<Disposer>();
    disposers.push(
      addEventListener(div, 'dragover', (ev) => {
        // this allows drop
        // https://stackoverflow.com/questions/36548805/adding-eventlistener-for-file-drop
        ev.preventDefault();
      })
    );

    disposers.push(
      addEventListener(div, 'dragenter', () => {
        dragEnterCounterNode.setValueFn((it) => it + 1);
      })
    );
    disposers.push(
      addEventListener(div, 'dragleave', () => {
        dragEnterCounterNode.setValueFn((it) => it - 1);
      })
    );

    disposers.push(
      addEventListener(div, 'drop', (ev) => {
        dragEnterCounterNode.setValue(0);
        (ev as any)._deusHexHandled = true;
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
      })
    );

    return tuple(undefined, sequenceDisposers(disposers));
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
}

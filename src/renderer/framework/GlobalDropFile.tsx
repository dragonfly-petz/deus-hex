import { useEffect } from 'react';
import {
  useMkReactiveNodeMemo,
  useReactiveVal,
} from '../reactive-state/reactive-hooks';
import style from './GlobalDropFile.module.scss';
import {
  useAppHelper,
  useAppReactiveNodes,
  useDomIpc,
} from '../context/context';
import { isNotNully, isNully } from '../../common/null';
import { includesNarrowing, safeHead } from '../../common/array';
import { allFileTypeExtensions } from '../../common/petz/file-types';
import { Disposer, sequenceDisposers } from '../../common/disposable';
import { addEventListenerDocument } from '../../common/react';

export const GlobalDropFile = () => {
  const dragEnterCounterNode = useMkReactiveNodeMemo(0);
  const isOver = useReactiveVal(
    dragEnterCounterNode.fmapStrict((it) => it > 0)
  );
  const dropFileHasDrag = useReactiveVal(useAppReactiveNodes().dropFileHasDrag);
  const domIpc = useDomIpc();
  const appHelper = useAppHelper();
  useEffect(() => {
    const disposers = new Array<Disposer>();

    disposers.push(
      addEventListenerDocument(document, 'dragover', (event) => {
        event.preventDefault();
      })
    );

    disposers.push(
      addEventListenerDocument(document, 'dragenter', () => {
        dragEnterCounterNode.setValueFn((it) => it + 1);
      })
    );

    disposers.push(
      addEventListenerDocument(document, 'dragleave', () => {
        dragEnterCounterNode.setValueFn((it) => it - 1);
      })
    );

    disposers.push(
      addEventListenerDocument(document, 'drop', (ev) => {
        dragEnterCounterNode.setValue(0);
        if ((ev as any)._deusHexHandled as boolean) {
          return;
        }

        const paths = new Array<string>();
        for (const file of ev.dataTransfer?.files ?? []) {
          paths.push(file.path);
        }
        const validExtensions = allFileTypeExtensions;
        const filter = paths.filter((it) => {
          const extSplit = it.split('.');
          const ext = extSplit.length > 1 ? extSplit.pop() : null;
          const extWithDot = isNotNully(ext) ? `.${ext}` : '';
          return includesNarrowing(validExtensions, extWithDot);
        });
        const pickedPath = safeHead(filter);
        if (isNully(pickedPath)) {
          domIpc.addFlashMessage({
            message: `No valid files dropped: expected file with extension ${Array.from(
              validExtensions
            ).join(' ,')}`,
            title: 'Invalid file dropped',
            kind: 'warn',
          });
        } else {
          appHelper.openEditorWithFile(pickedPath);
        }
      })
    );
    return sequenceDisposers(disposers);
  }, [appHelper, domIpc, dragEnterCounterNode]);
  if (!isOver || dropFileHasDrag) return null;
  return (
    <div className={style.wrapper}>
      <div className={style.info}>Drop file anywhere to open</div>
    </div>
  );
};

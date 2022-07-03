import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { defaultKeymap } from '@codemirror/commands';
import { useRef } from 'react';
import { useMemoRef } from '../hooks/use-memo-ref';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import style from './CodeMirror.module.scss';
import {
  useListenReactiveVal,
  useReactiveVal,
} from '../reactive-state/reactive-hooks';
import { isNully } from '../../common/null';

export const CodeMirror = ({
  valueNode,
}: {
  valueNode: ReactiveNode<string>;
}) => {
  const initialValue = useReactiveVal(valueNode);
  const valueNodeRef = useRef(valueNode);
  valueNodeRef.current = valueNode;

  const { refSetter, resultRef } = useMemoRef((div: HTMLDivElement) => {
    const startState = EditorState.create({
      doc: initialValue,
      extensions: [
        basicSetup,
        keymap.of(defaultKeymap),
        EditorView.updateListener.of((v) => {
          if (v.docChanged) {
            valueNodeRef.current.setValue(v.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: div,
    });
    return [view, () => {}];
  });
  useListenReactiveVal(
    valueNode,
    (val) => {
      const view = resultRef.current;
      console.log(view, val.substring(0, 50));
      if (isNully(view)) return;
      if (view.state.doc.toString() !== val) {
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: val,
          },
        });
      }
    },
    true
  );

  return <div className={style.main} ref={refSetter} />;
};

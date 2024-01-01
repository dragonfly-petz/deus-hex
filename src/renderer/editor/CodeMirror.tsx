import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import {
  defaultKeymap,
  indentWithTab,
  insertTab,
  isolateHistory,
} from '@codemirror/commands';
import { isRight } from 'fp-ts/Either';
import { useMemoRef } from '../hooks/use-memo-ref';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import style from './CodeMirror.module.scss';
import { useListenReactiveVal } from '../reactive-state/reactive-hooks';
import { isNully } from '../../common/null';
import { voidFn } from '../../common/function';
import { ballIdGutter, parsedLnzUpdateEffect } from './BallIdGutter';
import { ReactiveVal } from '../../common/reactive/reactive-interface';
import { ParsedLnzResult } from '../../common/petz/parser/main';

export function CodeMirror({
  valueNode,
  parsedData,
}: {
  valueNode: ReactiveNode<string>;
  parsedData: ReactiveVal<ParsedLnzResult>;
}) {
  const indentWithTabCustom = { ...indentWithTab, run: insertTab };
  console.log('CODE MIRROR');
  const { refSetter, resultRef } = useMemoRef((div: HTMLDivElement) => {
    const startState = EditorState.create({
      doc: valueNode.getValue(),
      extensions: [
        basicSetup,
        keymap.of(defaultKeymap),
        keymap.of([indentWithTabCustom]),
        EditorState.tabSize.of(8),
        EditorView.updateListener.of((v) => {
          if (v.docChanged) {
            valueNode.setValue(v.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
        ballIdGutter,
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: div,
    });
    return [view, voidFn];
  });

  useListenReactiveVal(parsedData, (it) => {
    const view = resultRef.current;
    if (isNully(view)) return;
    const val = isRight(it) ? it.right : null;
    view.dispatch({
      effects: parsedLnzUpdateEffect.of(val),
    });
    console.log(it);
  });

  useListenReactiveVal(
    valueNode,
    (val) => {
      const view = resultRef.current;
      // eslint-disable-next-line no-console
      // console.log(view, val.substring(0, 50));
      if (isNully(view)) return;
      // we do this to account for changes made externally but it would be better to have a different way to react to this because this code does a full comparison every time the editor changes a char
      if (view.state.doc.toString() !== val) {
        const snap = view.scrollSnapshot();
        view.dispatch({
          annotations: [isolateHistory.of('full')],
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: val,
          },
          effects: [snap],
        });
      }

      /*
      this is how to access history obj in case we ever want it
      window.foo = view.state.field(historyField); */
    },
    true
  );

  return <div className={style.main} ref={refSetter} />;
}

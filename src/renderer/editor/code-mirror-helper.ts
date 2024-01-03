import { EditorView } from '@codemirror/view';

export function jumpToLine(view: EditorView, l: number) {
  const lineInfo = view.state.doc.line(l);
  view.dispatch({
    selection: { anchor: lineInfo.from },
    effects: [EditorView.scrollIntoView(lineInfo.from, { y: 'start' })],
  });
}

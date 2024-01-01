import { EditorView, gutter, GutterMarker } from '@codemirror/view';

class NumberMarker extends GutterMarker {
  constructor(readonly number: number) {
    super();
  }

  eq(other: NumberMarker) {
    return this.number == other.number;
  }

  toDOM() {
    return document.createTextNode(this.number.toString());
  }
}

export const ballIdGutter = [
  gutter({
    class: 'cm-ball-id-gutter',
    lineMarker: (view, line, _otherMarkers) => {
      const n = view.state.doc.lineAt(line.from).number;
      if (n < 100) return null;
      return new NumberMarker(n);
    },
  }),
  EditorView.baseTheme({
    '.cm-ball-id-gutter .cm-gutterElement': {
      color: 'red',
      paddingLeft: '5px',
      cursor: 'default',
    },
  }),
];

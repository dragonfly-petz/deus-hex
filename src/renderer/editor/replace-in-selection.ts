import { EditorView } from '@codemirror/view';
import { getSearchQuery } from '@codemirror/search';

export function replaceAllInSelection(view: EditorView): boolean {
  const { state } = view;
  const query = getSearchQuery(state);
  if (!query.valid || !query.replace) return false; // nothing to do

  const changes: { from: number; to: number; insert: string }[] = [];

  for (const range of state.selection.ranges) {
    if (range.empty) continue; // ignore empty cursors

    // Search only inside this selection
    const cursor = query.getCursor(state.doc, range.from, range.to);
    for (
      let result = cursor.next();
      result.done !== true;
      result = cursor.next()
    ) {
      const { from, to } = result.value;
      changes.push({ from, to, insert: query.replace });
    }
  }

  if (!changes.length) return false;

  view.dispatch({
    changes,
    userEvent: 'input.replaceAll',
  });
  return true;
}

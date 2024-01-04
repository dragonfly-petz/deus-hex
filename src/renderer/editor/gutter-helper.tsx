import { EditorView, gutter, ViewUpdate } from '@codemirror/view';
import { Line, StateEffect, StateField } from '@codemirror/state';
import { isNotNully, isNully } from '../../common/null';
import { getTippyInst } from '../framework/Tooltip';
import { ParsedLnz } from '../../common/petz/parser/main';
import { safeGet, safeLast } from '../../common/array';

type GutterConfig = typeof gutter extends (ex: infer A) => any ? A : never;
export const tippyDomEventHandlers: GutterConfig['domEventHandlers'] = {
  mouseover: (_view, _line, event) => {
    const { target } = event;
    if (isNully(target)) return false;
    const tippyInst = getTippyInst(target);
    if (isNully(tippyInst)) {
      return false;
    }
    tippyInst.show();
    return true;
  },
  mouseout: (_view, _line, event) => {
    const { target } = event;
    if (isNully(target)) return false;
    const tippyInst = getTippyInst(target);
    if (isNully(tippyInst)) {
      return false;
    }
    if (tippyInst.props.interactive) {
      return false;
    }
    tippyInst.hide();
    return true;
  },
};
export const parsedLnzState = StateField.define<ParsedLnz | null>({
  create() {
    return null;
  },
  update(previous, transaction) {
    const effect = safeLast(
      transaction.effects.filter((it) => it.is(parsedLnzUpdateEffect))
    );
    if (isNotNully(effect)) {
      return effect.value;
    }
    return previous;
  },
});
export const parsedLnzUpdateEffect = StateEffect.define<ParsedLnz | null>({});

export const parsedLnzChange: (update: ViewUpdate) => boolean = (update) => {
  return update.transactions.some((trans) =>
    trans.effects.some((eff) => eff.is(parsedLnzUpdateEffect))
  );
};

export function getParsedLineFromPos(
  view: EditorView,
  state: ParsedLnz,
  pos: number
) {
  const lineNumber = view.state.doc.lineAt(pos).number;
  return safeGet(state.flat, lineNumber - 1);
}

export function getLinesBetween(view: EditorView, from: number, to: number) {
  const start = view.state.doc.lineAt(from);
  const end = view.state.doc.lineAt(to);
  const lines = new Array<Line>();
  lines.push(start);
  let lineN = start.number + 1;
  while (lineN < end.number) {
    lines.push(view.state.doc.line(lineN));
    lineN++;
  }
  lines.push(end);
  return lines;
}

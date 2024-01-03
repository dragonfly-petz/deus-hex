import { gutter } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
import { isNotNully, isNully } from '../../common/null';
import { getTippyInst } from '../framework/Tooltip';
import { ParsedLnz } from '../../common/petz/parser/main';
import { safeLast } from '../../common/array';

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

export const parsedLnzChange: GutterConfig['lineMarkerChange'] = (update) => {
  return update.transactions.some((trans) =>
    trans.effects.some((eff) => eff.is(parsedLnzUpdateEffect))
  );
};

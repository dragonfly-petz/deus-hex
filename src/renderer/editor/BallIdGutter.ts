import { gutter, GutterMarker } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
import { tippy } from '@tippyjs/react';
import { ParsedLnz } from '../../common/petz/parser/main';
import { safeGet, safeLast } from '../../common/array';
import { isNotNully, isNully } from '../../common/null';
import style from './CodeMirror.module.scss';
import { getTippyInst } from '../framework/Tooltip';
import { run } from '../../common/function';
import { ballLabels } from '../../common/petz/parser/line/ball-labels';

class BallNumberMarker extends GutterMarker {
  constructor(readonly number: number, readonly tooltipContent?: string) {
    super();
  }

  eq(other: BallNumberMarker) {
    return this.number === other.number;
  }

  toDOM() {
    const div = document.createElement('div');
    const node = document.createTextNode(this.number.toString());
    div.appendChild(node);
    if (isNotNully(this.tooltipContent)) {
      tippy(div, {
        content: this.tooltipContent,
        trigger: 'hover',
        placement: 'left',
      });
    }
    return div;
  }
}

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

export const ballIdGutterEx = [
  gutter({
    class: style.ballNumber,
    lineMarker: (view, line, _otherMarkers) => {
      const state = view.state.field(parsedLnzState);
      if (isNully(state)) {
        return null;
      }
      const lineNumber = view.state.doc.lineAt(line.from).number;
      const parsedLine = safeGet(state.flat, lineNumber - 1);
      if (isNully(parsedLine)) return null;
      if (
        (parsedLine.tag === 'addBall' || parsedLine.tag === 'ballzInfo') &&
        isNotNully(parsedLine.lineContent.ballId)
      ) {
        const { ballId } = parsedLine.lineContent;
        const tooltip = run(() => {
          if (parsedLine.tag !== 'ballzInfo') return null;
          if (isNully(state.fileType)) return null;
          const labels = ballLabels[state.fileType];
          if (isNully(labels)) return null;
          return labels[ballId];
        });
        return new BallNumberMarker(parsedLine.lineContent.ballId, tooltip);
      }
      return null;
    },

    lineMarkerChange: (update) => {
      return update.transactions.some((trans) =>
        trans.effects.some((eff) => eff.is(parsedLnzUpdateEffect))
      );
    },
    domEventHandlers: {
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
    },
  }),
];

export const ballIdGutter = [ballIdGutterEx, parsedLnzState.extension];

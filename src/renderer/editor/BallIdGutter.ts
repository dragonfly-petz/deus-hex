import { gutter, GutterMarker } from '@codemirror/view';
import { tippy } from '@tippyjs/react';
import { safeGet } from '../../common/array';
import { isNotNully, isNully } from '../../common/null';
import style from './CodeMirror.module.scss';
import { getTippyInst } from '../framework/Tooltip';
import { run } from '../../common/function';
import { ballLabels } from '../../common/petz/parser/line/ball-labels';
import {
  parsedLnzChange,
  parsedLnzState,
  tippyDomEventHandlers,
} from './gutter-helper';

class BallNumberMarker extends GutterMarker {
  constructor(
    readonly number: number,
    readonly tooltipContent?: string | null
  ) {
    super();
  }

  eq(other: BallNumberMarker) {
    return this.number === other.number;
  }

  toDOM() {
    const div = document.createElement('div');
    const node = document.createTextNode(this.number.toString());
    div.appendChild(node);
    div.className = style.ballNumber;
    if (isNotNully(this.tooltipContent)) {
      tippy(div, {
        content: this.tooltipContent,
        trigger: 'hover',
        placement: 'left',
      });
    }
    return div;
  }

  destroy(dom: Node) {
    getTippyInst(dom)?.destroy();
  }
}

export const ballIdGutter = [
  gutter({
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

    lineMarkerChange: parsedLnzChange,
    domEventHandlers: tippyDomEventHandlers,
  }),
];

import { gutter, GutterMarker } from '@codemirror/view';
import { tippy } from '@tippyjs/react';
import * as E from 'fp-ts/Either';
import { safeGet } from '../../common/array';
import { isNotNully, isNully } from '../../common/null';
import style from './CodeMirror.module.scss';
import { getTippyInst } from '../framework/Tooltip';
import { run } from '../../common/function';
import {
  parsedLnzChange,
  parsedLnzState,
  tippyDomEventHandlers,
} from './gutter-helper';
import { isNever } from '../../common/type-assertion';
import {
  BallzInfo,
  getBallInfo,
  getBaseBallId,
} from '../../common/petz/parser/line/ball-helper';
import { deepEqual } from '../../common/equality';
import { FileType } from '../../common/petz/file-types';
import { getBallLabelData } from '../../common/petz/parser/line/ball-labels';
import { classNames } from '../../common/react';

class BallRefMarker extends GutterMarker {
  constructor(
    readonly ballIds: Array<number | null>,
    private readonly ballz: BallzInfo,
    private readonly fileType: FileType | null
  ) {
    super();
  }

  eq(other: BallRefMarker) {
    return deepEqual(this.ballIds, other.ballIds);
  }

  toDOM() {
    const div = document.createElement('div');
    div.className = style.ballRefMarkerContainer;

    for (const ballId of this.ballIds) {
      const itemDiv = document.createElement('div');
      div.appendChild(itemDiv);

      const [addClass, content, tooltip] = run(() => {
        if (isNully(ballId)) {
          return [style.missingRef, 'null', 'Expected ballId but none found!'];
        }
        const info = getBallInfo(ballId, this.ballz);
        if (E.isLeft(info)) {
          return [style.errorRef, 'err', info.left];
        }
        const baseBallId = getBaseBallId(info.right);
        if (E.isLeft(baseBallId)) {
          return [style.errorRef, 'err', baseBallId.left];
        }
        if (isNully(this.fileType)) {
          return [style.errorRef, 'err', 'No file type provided'];
        }
        const labelData = getBallLabelData(baseBallId.right, this.fileType);
        if (isNully(labelData)) {
          return [
            style.errorRef,
            'err',
            `Couldn\`t find label data for base ball ${baseBallId.right}]`,
          ];
        }
        return [
          classNames(
            info.right.line.tag === 'ballzInfo' ? style.isBaseBall : '',
            `zone-${labelData.zone}`
          ),
          labelData.abbr,
          labelData.label,
        ];
      });
      itemDiv.className = classNames(style.ballRefMarker, addClass);
      itemDiv.appendChild(document.createTextNode(content));
      if (isNotNully(tooltip)) {
        tippy(itemDiv, {
          content: tooltip,
          trigger: 'hover',
          placement: 'left',
        });
      }
    }
    return div;
  }

  destroy(dom: Node) {
    getTippyInst(dom)?.destroy();
  }
}

export const ballRefGutter = [
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
        parsedLine.tag !== 'addBall' &&
        parsedLine.tag !== 'ballzInfo' &&
        parsedLine.tag !== 'linez' &&
        parsedLine.tag !== 'paintBall'
      ) {
        return null;
      }

      const ballIds = run(() => {
        switch (parsedLine.tag) {
          case 'ballzInfo': {
            return [parsedLine.lineContent.ballId];
          }
          case 'addBall': {
            return [parsedLine.lineContent.ballRef];
          }
          case 'paintBall': {
            return [parsedLine.lineContent.ballRef];
          }
          case 'linez': {
            return [
              parsedLine.lineContent.startBall,
              parsedLine.lineContent.endBall,
            ];
          }
          default:
            return isNever(parsedLine);
        }
      });

      return new BallRefMarker(ballIds, state.ballz, state.fileType);
    },

    lineMarkerChange: parsedLnzChange,
    domEventHandlers: tippyDomEventHandlers,
  }),
];

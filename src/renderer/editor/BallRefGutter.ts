import { EditorView, gutter, GutterMarker } from '@codemirror/view';
import { tippy } from '@tippyjs/react';
import * as E from 'fp-ts/Either';
import { isNotNully, isNully } from '../../common/null';
import style from './CodeMirror.module.scss';
import { getTippyInst } from '../framework/Tooltip';
import { run } from '../../common/function';
import {
  getParsedLineFromPos,
  parsedLnzChange,
  parsedLnzState,
} from './gutter-helper';
import { isNever } from '../../common/type-assertion';
import {
  BallContentLine,
  BallzInfo,
  getBallInfo,
  getBaseBallId,
} from '../../common/petz/parser/line/ball-helper';
import { deepEqual } from '../../common/equality';
import { FileType } from '../../common/petz/file-types';
import { getBallLabelData } from '../../common/petz/parser/line/ball-labels';
import { classNames } from '../../common/react';
import { createBallRefTooltip } from './ball-ref-tooltip';
import { jumpToLine } from './code-mirror-helper';

export class EmptyBallRefMarker extends GutterMarker {
  toDOM() {
    const div = document.createElement('div');
    div.className = style.ballRefMarkerContainer;
    for (const _ of [null, null]) {
      const itemDiv = document.createElement('div');
      div.appendChild(itemDiv);
      itemDiv.className = classNames(style.ballRefMarker);
      itemDiv.appendChild(document.createTextNode('ffff'));
    }

    return div;
  }
}

export class BallRefMarker extends GutterMarker {
  constructor(
    readonly ballDefLine: BallContentLine | null,
    readonly view: EditorView,
    readonly ballIds: Array<number | null>,
    private readonly ballz: BallzInfo,
    private readonly fileType: FileType | null,
    private readonly omissions: Set<number>
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
          createBallRefTooltip(
            info.right,
            labelData,
            (l) => {
              jumpToLine(this.view, l);
            },
            this.omissions
          ),
        ];
      });
      itemDiv.className = classNames(style.ballRefMarker, addClass);
      itemDiv.appendChild(document.createTextNode(content));
      if (isNotNully(tooltip)) {
        tippy(itemDiv, {
          appendTo: () => document.body,
          content: tooltip,
          placement: 'left-end',
          trigger: 'click',
          maxWidth: 'none',
          interactive: true,
          onClickOutside: (inst) => {
            inst.hide();
          },
        });
      }
    }
    if (
      isNotNully(this.ballDefLine) &&
      isNotNully(this.ballDefLine.lineContent.ballId)
    ) {
      const numberingContainerDiv = document.createElement('div');
      div.appendChild(numberingContainerDiv);
      numberingContainerDiv.className = style.numberingContainerDiv;
      const numberingDiv = document.createElement('div');
      numberingContainerDiv.appendChild(numberingDiv);
      numberingDiv.className = classNames(
        style.ballNumberMarker,
        this.ballDefLine.tag === 'ballzInfo' ? style.isBaseBall : null
      );
      numberingDiv.appendChild(
        document.createTextNode(String(this.ballDefLine.lineContent.ballId))
      );
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
      const parsedLine = getParsedLineFromPos(view, state, line.from);
      if (isNully(parsedLine)) return null;
      if (
        parsedLine.tag !== 'addBall' &&
        parsedLine.tag !== 'ballzInfo' &&
        parsedLine.tag !== 'linez' &&
        parsedLine.tag !== 'paintBall' &&
        parsedLine.tag !== 'omission'
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
          case 'omission': {
            return [parsedLine.lineContent.ballRef];
          }
          default:
            return isNever(parsedLine);
        }
      });

      return new BallRefMarker(
        parsedLine.tag === 'addBall' || parsedLine.tag === 'ballzInfo'
          ? parsedLine
          : null,
        view,
        ballIds,
        state.ballz,
        state.fileType,
        state.omissionsSet
      );
    },
    initialSpacer: () => {
      return new EmptyBallRefMarker();
    },
    lineMarkerChange: parsedLnzChange,
    // domEventHandlers: tippyDomEventHandlers,
  }),
];

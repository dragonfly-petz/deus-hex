import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import { Range } from '@codemirror/state';
import style from './CodeMirror.module.scss';
import {
  getLinesBetween,
  parsedLnzChange,
  parsedLnzState,
} from './gutter-helper';
import { isNully } from '../../common/null';
import { safeGet } from '../../common/array';
import { colDataToContentStrings } from '../../common/petz/parser/line/col-data';

export const omissionHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getOmissions(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        parsedLnzChange(update)
      ) {
        this.decorations = getOmissions(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,

    /*   eventHandlers: {
         // if we need them...
         mousedown: (_e, _view) => {},
       }, */
  }
);

const lineOmission = Decoration.mark({ class: style.lineOmission });
const valueOmission = Decoration.mark({ class: style.valueOmission });

function getOmissions(view: EditorView) {
  const state = view.state.field(parsedLnzState);
  if (isNully(state)) {
    return Decoration.set([]);
  }
  const { omissionsSet } = state;
  const marks: Array<Range<Decoration>> = [];

  for (const { from, to } of view.visibleRanges) {
    const editorLines = getLinesBetween(view, from, to);
    editorLines.forEach((editorLine) => {
      const line = safeGet(state.flat, editorLine.number - 1);
      if (isNully(line) || editorLine.from === editorLine.to) {
        return;
      }
      switch (line.tag) {
        case 'ballzInfo':
          if (isNully(line.lineContent.ballId)) {
            return;
          }
          if (omissionsSet.has(line.lineContent.ballId)) {
            marks.push(lineOmission.range(editorLine.from, editorLine.to));
          }

          break;
        case 'addBall':
          if (omissionsSet.has(line.lineContent.ballRef)) {
            const start = editorLine.from + line.initialWhitespace.length;
            marks.push(
              valueOmission.range(
                start,
                start + line.lineContent.ballRef.toString().length
              )
            );
          }
          if (isNully(line.lineContent.ballId)) {
            return;
          }
          if (omissionsSet.has(line.lineContent.ballId)) {
            marks.push(lineOmission.range(editorLine.from, editorLine.to));
          }
          break;

        case 'paintBall':
          if (omissionsSet.has(line.lineContent.ballRef)) {
            const start = editorLine.from + line.initialWhitespace.length;
            marks.push(
              valueOmission.range(
                start,
                start + line.lineContent.ballRef.toString().length
              )
            );
          }
          break;

        case 'linez':
          {
            let start = editorLine.from + line.initialWhitespace.length;
            if (omissionsSet.has(line.lineContent.startBall)) {
              marks.push(
                valueOmission.range(
                  start,
                  start + line.lineContent.startBall.toString().length
                )
              );
            }
            const strs = colDataToContentStrings(line.lineContent.content);

            start += strs[0].length + strs[1].length;
            if (omissionsSet.has(line.lineContent.endBall)) {
              marks.push(
                valueOmission.range(
                  start,
                  start + line.lineContent.endBall.toString().length
                )
              );
            }
          }
          break;
        case 'move':
          if (omissionsSet.has(line.lineContent.ballRef)) {
            const start = editorLine.from + line.initialWhitespace.length;
            marks.push(
              valueOmission.range(
                start,
                start + line.lineContent.ballRef.toString().length
              )
            );
          }
          break;

        case 'projectBall':
          {
            let start = editorLine.from + line.initialWhitespace.length;
            if (omissionsSet.has(line.lineContent.anchorBall)) {
              marks.push(
                valueOmission.range(
                  start,
                  start + line.lineContent.anchorBall.toString().length
                )
              );
            }
            const strs = colDataToContentStrings(line.lineContent.content);

            start += strs[0].length + strs[1].length;
            if (omissionsSet.has(line.lineContent.ball)) {
              marks.push(
                valueOmission.range(
                  start,
                  start + line.lineContent.ball.toString().length
                )
              );
            }
          }
          break;

        default:
      }
    });
  }
  return Decoration.set(marks, true);
}

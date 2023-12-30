import * as P from 'parser-ts/Parser';
import { flow, pipe } from 'fp-ts/function';
import * as S from 'parser-ts/string';
import * as StringFP from 'fp-ts/string';
import { isString } from 'fp-ts/string';
import * as O from 'fp-ts/Option';

import { push, pushWithKey, startArray } from './util';
import { petzSepParser, sectionContentLineParser } from './section';
import { isObjectWithKey } from '../../type-assertion';
/*
 * ;Base ball,diameter(% of baseball),direction (x,y,z),colour,outline colour,fuzz,outline,group,texture
 * */
export const paintBallzLineParser = sectionContentLineParser(
  pipe(
    startArray<string, []>(),
    // we have to break these because fp-ts doesn't support this many args to pipe haha
    flow(
      pushWithKey('baseBall', S.int),
      push(petzSepParser),
      pushWithKey('diameter', S.int),
      push(petzSepParser),
      pushWithKey('dirX', S.float),
      push(petzSepParser),
      pushWithKey('dirY', S.float),
      push(petzSepParser)
    ),
    flow(
      pushWithKey('dirZ', S.float),
      push(petzSepParser),
      pushWithKey('color', S.int),
      push(petzSepParser),
      pushWithKey('outlineColor', S.int),
      push(petzSepParser),
      pushWithKey('fuzz', S.int),
      push(petzSepParser)
    ),
    flow(
      pushWithKey('outline', S.int),
      push(petzSepParser),
      pushWithKey('group', S.int),
      push(petzSepParser),
      pushWithKey('texture', S.int),
      push(P.maybe(StringFP.Monoid)(petzSepParser)),
      pushWithKey('optionalColumn', P.optional(S.int)),
      push(P.maybe(StringFP.Monoid)(petzSepParser))
    ),

    P.map((it) => ['paintBall', it] as const)
  )
);

export type PaintBallzLine = typeof paintBallzLineParser extends P.Parser<
  any,
  infer A
>
  ? A
  : never;

export function paintBallzLineSerialize(line: PaintBallzLine) {
  const parts = new Array<string>();
  parts.push(line.initialWhitespace);
  for (const sec of line.lineContent) {
    if (isString(sec)) {
      parts.push(sec);
    } else if (sec.length === 2) {
      const val = sec[1];
      if (isObjectWithKey(val, 'value')) {
        parts.push(String(val.value));
      } else {
        parts.push(String(sec[1]));
      }
    }
  }
  parts.push(line.remainingLineChars);
  if (O.isSome(line.inlineComment)) {
    parts.push(line.inlineComment.value);
  }
  return parts.join('');
}

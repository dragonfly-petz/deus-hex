import * as P from 'parser-ts/Parser';
import { flow, pipe } from 'fp-ts/function';
import * as S from 'parser-ts/string';
import * as String from 'fp-ts/string';

import { push, pushWithKey, startArray } from './util';
import { petzSepParser, sectionContentLineParser } from './section';
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
      push(P.maybe(String.Monoid)(petzSepParser)),
      pushWithKey('optionalColumn', P.optional(S.int)),
      push(P.maybe(String.Monoid)(petzSepParser))
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

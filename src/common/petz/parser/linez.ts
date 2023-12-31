import { flow, pipe } from 'fp-ts/function';
import * as S from 'parser-ts/string';
import * as P from 'parser-ts/Parser';
import * as StringFP from 'fp-ts/string';
import {
  petzSepParser,
  rawLineSerializer,
  sectionContentLineParser,
} from './section';
import { push, pushWithKey, startArray } from './util';
import { colDataSerializer } from './paint-ballz';

export const linezLineParser = sectionContentLineParser(
  pipe(
    startArray<string, string>(),

    // we have to break these because fp-ts doesn't support this many args to pipe haha
    flow(
      pushWithKey('startBall', S.int),
      push(petzSepParser),
      pushWithKey('endBall', S.int),
      push(petzSepParser),
      pushWithKey('fuzz', S.int),
      push(petzSepParser),
      pushWithKey('color', S.int),
      push(petzSepParser)
    ),
    flow(
      pushWithKey('leftColor', S.int),
      push(petzSepParser),
      pushWithKey('rightColor', S.int),
      push(petzSepParser),
      pushWithKey('startThickness', S.int),
      push(petzSepParser),
      pushWithKey('endThickness', S.int)
    ),
    flow(
      push(P.maybe(StringFP.Monoid)(petzSepParser)),
      pushWithKey('optionalColumn1', P.optional(S.int)),
      push(P.maybe(StringFP.Monoid)(petzSepParser)),
      pushWithKey('optionalColumn2', P.optional(S.int)),
      push(P.maybe(StringFP.Monoid)(petzSepParser))
    ),
    P.map((it) => ['linez', it] as const)
  )
);
export type LinezLine = typeof linezLineParser extends P.Parser<any, infer A>
  ? A
  : never;

export function linezLineSerialize(line: LinezLine) {
  if (line.tag !== 'linez') {
    return rawLineSerializer(line);
  }
  return colDataSerializer(line);
}

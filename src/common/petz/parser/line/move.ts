import { flow, pipe } from 'fp-ts/function';
import * as S from 'parser-ts/string';
import * as P from 'parser-ts/Parser';
import {
  LineBase,
  lineContentChar,
  rawLineSerializer,
  sectionContentLineParser,
} from '../section';
import { tuple } from '../../../array';
import { push, pushWithKey, startArray } from '../util';
import { colDataSerializerWith } from './col-data';

const moveContentLineParser = pipe(
  startArray<string, string>(),
  flow(pushWithKey('ballRef', S.int), push(S.many(lineContentChar))),
  P.map((it) =>
    tuple('move' as const, {
      content: it,
      ballRef: it[0][1] as number,
    })
  )
);
export const moveLineParser = sectionContentLineParser(moveContentLineParser);

type MoveContentLineTuple = typeof moveContentLineParser extends P.Parser<
  any,
  infer A
>
  ? A
  : never;
export type MoveContentLine = LineBase<
  MoveContentLineTuple[0],
  MoveContentLineTuple[1]
>;

export type MoveLine = typeof moveLineParser extends P.Parser<any, infer A>
  ? A
  : never;

export function moveLineSerialize(line: MoveLine) {
  if (line.tag !== 'move') {
    return rawLineSerializer(line);
  }
  return colDataSerializerWith(line, (it) => it.content);
}

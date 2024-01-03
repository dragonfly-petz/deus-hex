import { flow, pipe } from 'fp-ts/function';
import * as S from 'parser-ts/string';
import * as P from 'parser-ts/Parser';
import {
  LineBase,
  lineContentChar,
  rawLineSerializer,
  sectionContentLineParser,
} from '../section';
import { nullable } from '../../../null';
import { tuple } from '../../../array';
import { push, pushWithKey, startArray } from '../util';
import { colDataSerializerWith } from './col-data';

const addBallContentLineParser = pipe(
  startArray<string, string>(),
  flow(pushWithKey('ballRef', S.int), push(S.many(lineContentChar))),
  P.map((it) =>
    tuple('addBall' as const, {
      content: it,
      ballRef: it[0][1] as number,
      ballId: nullable<number>(),
    })
  )
);
export const addBallLineParser = sectionContentLineParser(
  addBallContentLineParser
);

type AddBallContentLineTuple = typeof addBallContentLineParser extends P.Parser<
  any,
  infer A
>
  ? A
  : never;
export type AddBallContentLine = LineBase<
  AddBallContentLineTuple[0],
  AddBallContentLineTuple[1]
>;

export type AddBallLine = typeof addBallLineParser extends P.Parser<
  any,
  infer A
>
  ? A
  : never;

export function addBallLineSerialize(line: AddBallLine) {
  if (line.tag !== 'addBall') {
    return rawLineSerializer(line);
  }
  return colDataSerializerWith(line, (it) => it.content);
}

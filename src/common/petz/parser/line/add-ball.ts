import { pipe } from 'fp-ts/function';
import * as S from 'parser-ts/string';
import * as P from 'parser-ts/Parser';
import {
  baseLineSerializer,
  LineBase,
  lineContentChar,
  rawLineSerializer,
  sectionContentLineParser,
} from '../section';
import { nullable } from '../../../null';
import { tuple } from '../../../array';

const addBallContentLineParser = pipe(
  S.many(lineContentChar),
  P.map((it) =>
    tuple('addBall' as const, { content: it, ballId: nullable<number>() })
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
  return baseLineSerializer(line, (it) => it.content);
}

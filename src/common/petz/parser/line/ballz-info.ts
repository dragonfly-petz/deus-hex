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

const ballzInfoContentLineParser = pipe(
  S.many(lineContentChar),
  P.map((it) =>
    tuple('ballzInfo' as const, { content: it, ballId: nullable<number>() })
  )
);

type BallzInfoContentLineTuple =
  typeof ballzInfoContentLineParser extends P.Parser<any, infer A> ? A : never;
export type BallzInfoContentLine = LineBase<
  BallzInfoContentLineTuple[0],
  BallzInfoContentLineTuple[1]
>;

export const ballzInfoLineParser = sectionContentLineParser(
  ballzInfoContentLineParser
);

export type BallzInfoLine = typeof ballzInfoLineParser extends P.Parser<
  any,
  infer A
>
  ? A
  : never;

export function ballzInfoLineSerialize(line: BallzInfoLine) {
  if (line.tag !== 'ballzInfo') {
    return rawLineSerializer(line);
  }
  return baseLineSerializer(line, (it) => it.content);
}

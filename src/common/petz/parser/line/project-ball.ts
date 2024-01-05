import { flow, pipe } from 'fp-ts/function';
import * as S from 'parser-ts/string';
import * as P from 'parser-ts/Parser';
import {
  LineBase,
  lineContentChar,
  petzSepParser,
  rawLineSerializer,
  sectionContentLineParser,
} from '../section';
import { tuple } from '../../../array';
import { push, pushWithKey, startArray } from '../util';
import { colDataSerializerWith } from './col-data';

const projectBallContentLineParser = pipe(
  startArray<string, string>(),
  flow(
    pushWithKey('anchorBall', S.int),
    push(petzSepParser),
    pushWithKey('ball', S.int),
    push(S.many(lineContentChar))
  ),
  P.map((it) =>
    tuple('projectBall' as const, {
      content: it,
      anchorBall: it[0][1] as number,
      ball: it[2][1] as number,
    })
  )
);
export const projectBallLineParser = sectionContentLineParser(
  projectBallContentLineParser
);

type ProjectBallContentLineTuple =
  typeof projectBallContentLineParser extends P.Parser<any, infer A>
    ? A
    : never;
export type ProjectBallContentLine = LineBase<
  ProjectBallContentLineTuple[0],
  ProjectBallContentLineTuple[1]
>;

export type ProjectBallLine = typeof projectBallLineParser extends P.Parser<
  any,
  infer A
>
  ? A
  : never;

export function projectBallLineSerialize(line: ProjectBallLine) {
  if (line.tag !== 'projectBall') {
    return rawLineSerializer(line);
  }
  return colDataSerializerWith(line, (it) => it.content);
}

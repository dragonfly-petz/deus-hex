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

const omissionContentLineParser = pipe(
  startArray<string, string>(),
  flow(pushWithKey('ballRef', S.int), push(S.many(lineContentChar))),
  P.map((it) =>
    tuple('omission' as const, {
      content: it,
      ballRef: it[0][1] as number,
    })
  )
);
export const omissionLineParser = sectionContentLineParser(
  omissionContentLineParser
);

type OmissionContentLineTuple =
  typeof omissionContentLineParser extends P.Parser<any, infer A> ? A : never;
export type OmissionContentLine = LineBase<
  OmissionContentLineTuple[0],
  OmissionContentLineTuple[1]
>;

export type OmissionLine = typeof omissionLineParser extends P.Parser<
  any,
  infer A
>
  ? A
  : never;

export function omissionLineSerialize(line: OmissionLine) {
  if (line.tag !== 'omission') {
    return rawLineSerializer(line);
  }
  return colDataSerializerWith(line, (it) => it.content);
}

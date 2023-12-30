import { pipe } from 'fp-ts/function';
import * as S from 'parser-ts/string';
import * as P from 'parser-ts/Parser';
import {
  baseLineSerializer,
  lineContentChar,
  rawLineSerializer,
  sectionContentLineParser,
} from './section';

export const linezLineParser = sectionContentLineParser(
  pipe(
    S.many(lineContentChar),
    P.map((it) => ['linez', it] as const)
  )
);
export type LinezLine = typeof linezLineParser extends P.Parser<any, infer A>
  ? A
  : never;

export function linezLineSerialize(line: LinezLine) {
  if (line.tag === 'raw') {
    return rawLineSerializer(line);
  }
  return baseLineSerializer(line, (content) => {
    return content;
  });
}

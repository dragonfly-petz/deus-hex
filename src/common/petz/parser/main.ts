import { pipe } from 'fp-ts/function';
import * as P from 'parser-ts/Parser';
import * as S from 'parser-ts/string';
import * as C from 'parser-ts/char';
import { bimap, Either } from 'fp-ts/Either';
import { stream } from 'parser-ts/Stream';
import { and, not } from 'fp-ts/Predicate';
import { eitherW, hSpace, isLineBreak, lineBreak, notLineBreak } from './util';
import { voidFn } from '../../function';

export const runParser: <A>(
  p: P.Parser<string, A>,
  source: string
) => Either<string, A> = (p, source) =>
  pipe(
    p(stream(source.split(''))),
    bimap(
      (err) => err.expected.join(', '),
      (succ) => succ.value
    )
  );

export function parseLnz(str: string) {
  return runParser(lnzParser(), str);
}

const lnzParser = () =>
  P.manyTill(
    eitherW(sectionParser, () => rawLineParser),
    P.eof()
  );

const lineBreakOrEof = P.either(
  P.map(voidFn)(lineBreak),
  P.eof as () => P.Parser<string, void>
);

function lineParser<A>(p: P.Parser<string, A>) {
  return pipe(
    S.many(hSpace),
    P.bindTo('initialSpaces'),
    P.bind('lineContent', () => p),
    P.bind('inlineComment', () => P.optional(inlineCommentParser)),
    P.chainFirst(() => lineBreakOrEof),
    P.map((it) => ({ ...it, tag: 'rawLine' as const }))
  );
}

const isCommentChar = (c: C.Char) => c === ';';

const inlineCommentParser = pipe(
  S.fold([P.expected(P.sat(isCommentChar), 'a ;'), S.many(notLineBreak)])
);
const lineContentParser: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(and(not(isLineBreak))(not(isCommentChar))),
  'a line break'
);

const rawLineParser = lineParser(S.many(lineContentParser));
const notSectionHeaderParser = pipe(
  P.lookAhead(lineBreak),
  P.alt(() => S.fold([C.notChar('['), S.many(lineContentParser)]))
);

const sectionHeaderParser = pipe(
  C.char('['),
  P.chain(() => C.many(C.notChar(']'))),
  P.chainFirst(() => C.char(']'))
);
const sectionParser = pipe(
  lineParser(sectionHeaderParser),
  P.chain((line) => {
    return pipe(
      P.many(lineParser(notSectionHeaderParser)),
      P.map((lines) => ({
        ...line,
        tag: 'section' as const,
        sectionName: line.lineContent,
        lines,
      }))
    );
  })
);

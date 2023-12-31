import { pipe } from 'fp-ts/function';
import * as S from 'parser-ts/string';
import * as P from 'parser-ts/Parser';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import * as C from 'parser-ts/char';
import * as String from 'fp-ts/string';
import { and, not } from 'fp-ts/Predicate';
import {
  COMMA,
  eitherW,
  hSpace,
  isLineBreak,
  lineBreak,
  lookAheadW,
  notLineBreak,
  SEMICOLON,
} from './util';

export const PaintBallzName = 'Paint Ballz';
export const LinezName = 'Linez';

export const isCommentChar = (c: C.Char) => c === SEMICOLON;
export const lineContentChar: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(and(not(isLineBreak))(not(isCommentChar))),
  'not a line break and not a comment char'
);
const lineBreakOrEof = P.either(lineBreak, () =>
  pipe(
    P.eof() as P.Parser<string, void>,
    P.chain(() => P.of(''))
  )
);

export type LineBase<Tag, A> = {
  initialWhitespace: string;
  lineContent: A;
  remainingLineChars: string;
  inlineComment: Option<string>;
  endLineBreak: string;
  tag: Tag;
};

export function baseLineSerializer<Tag, A>(
  line: LineBase<Tag, A>,
  lnContent: (a: A) => string
) {
  const parts = new Array<string>();
  parts.push(line.initialWhitespace);
  parts.push(lnContent(line.lineContent));
  parts.push(line.remainingLineChars);
  if (O.isSome(line.inlineComment)) {
    parts.push(line.inlineComment.value);
  }
  parts.push(line.endLineBreak);
  return parts.join('');
}

export const rawLineParser = lineParser(
  pipe(
    S.many(lineContentChar),
    P.map((it) => ['raw' as const, it])
  )
);

export type RawParsedLine = typeof rawLineParser extends P.Parser<any, infer A>
  ? A
  : never;

export function rawLineSerializer(line: RawParsedLine) {
  return baseLineSerializer(line, (it) => it);
}

export function lineParser<Tag, A>(p: P.Parser<string, readonly [Tag, A]>) {
  return pipe(
    S.many(hSpace),
    P.bindTo('initialWhitespace'),
    P.bind('lineContent', () =>
      eitherW(
        pipe(
          lookAheadW(lineBreak),
          P.map(() => ['raw', ''] as const)
        ),
        () =>
          eitherW(
            pipe(
              commentParser,
              P.map((it) => ['comment', it] as const)
            ),
            () => p
          )
      )
    ),
    P.bind('remainingLineChars', () => S.many(lineContentChar)),
    P.bind('inlineComment', () => P.optional(commentParser)),
    P.bind('endLineBreak', () => lineBreakOrEof),
    P.map((it) => ({
      ...it,
      tag: it.lineContent[0],
      lineContent: it.lineContent[1],
    }))
  ) as P.Parser<string, LineBase<Tag, A> | LineBase<'raw', string>>;
}

const commentParser = pipe(
  S.fold([P.expected(P.sat(isCommentChar), 'a ;'), S.many(notLineBreak)])
);

export function sectionContentLineParser<Tag, A>(
  p: P.Parser<string, readonly [Tag, A]>
) {
  return lineParser(
    pipe(
      P.lookAhead(C.notChar('[')),
      P.chain(() => p)
    )
  );
}

const commaParser = C.char(COMMA);
export const petzSepParser = pipe(
  P.lookAhead(eitherW(hSpace, () => commaParser)),
  P.chain(() =>
    S.fold([
      S.many(hSpace),
      P.maybe(String.Monoid)(commaParser),
      S.many(hSpace),
    ])
  )
);

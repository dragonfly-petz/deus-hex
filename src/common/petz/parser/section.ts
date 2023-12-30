import { pipe } from 'fp-ts/function';
import * as S from 'parser-ts/string';
import * as P from 'parser-ts/Parser';
import { Option } from 'fp-ts/Option';
import * as C from 'parser-ts/char';
import * as String from 'fp-ts/string';
import { and, not } from 'fp-ts/Predicate';
import { voidFn } from '../../function';
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

const lineBreakOrEof = P.either(
  P.map(voidFn)(lineBreak),
  P.eof as () => P.Parser<string, void>
);
type LineBase<Tag, A> = {
  initialWhitespace: string;
  lineContent: A;
  remainingLineChars: string;
  inlineComment: Option<string>;
  tag: Tag;
};

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
    P.chainFirst(() => lineBreakOrEof),
    P.map((it) => ({
      ...it,
      tag: it.lineContent[0],
      lineContent: it.lineContent[1],
    }))
  ) as P.Parser<string, LineBase<Tag, A> | LineBase<'raw', string>>;
}

export const isCommentChar = (c: C.Char) => c === SEMICOLON;
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
export const lineContentChar: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(and(not(isLineBreak))(not(isCommentChar))),
  'not a line break and not a comment char'
);

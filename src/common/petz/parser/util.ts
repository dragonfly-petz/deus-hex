import * as C from 'parser-ts/char';
import * as P from 'parser-ts/Parser';
import { Parser } from 'parser-ts/Parser';
import { not } from 'fp-ts/Predicate';

const lineBreakRe = /^\n$/;
const hSpaceRe = /^[ \t]$/;
export const isLineBreak: (c: C.Char) => boolean = (c) => lineBreakRe.test(c);
const isHSpace: (c: C.Char) => boolean = (c) => hSpaceRe.test(c);

export const hSpace: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(isHSpace),
  'a line break'
);

export const lineBreak: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(isLineBreak),
  'a line break'
);

export const notLineBreak: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(not(isLineBreak)),
  'a line break'
);

export const eitherW: <I, A, B>(
  p: Parser<I, A>,
  f: () => Parser<I, B>
) => Parser<I, A | B> = P.either as any;

export const lookAheadW: <I, A>(p: Parser<I, A>) => Parser<I, any> =
  P.lookAhead as any;

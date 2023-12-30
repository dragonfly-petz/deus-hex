import * as C from 'parser-ts/char';
import * as P from 'parser-ts/Parser';
import { Parser } from 'parser-ts/Parser';
import { not } from 'fp-ts/Predicate';
import { pipe } from 'fp-ts/function';

export const SEMICOLON = ';';
export const COMMA = ',';

const lineBreakRe = /^\n$/;
const hSpaceRe = /^[ \t]$/;
export const isLineBreak: (c: C.Char) => boolean = (c) => lineBreakRe.test(c);
const isHSpace: (c: C.Char) => boolean = (c) => hSpaceRe.test(c);

export const hSpace: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(isHSpace),
  'horizontal space'
);

export const notHSpace: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(not(isHSpace)),
  'not horizontal space'
);

export const lineBreak: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(isLineBreak),
  'a line break'
);

export const notLineBreak: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(not(isLineBreak)),
  'not a line break'
);

export const eitherW: <I, A, B>(
  p: Parser<I, A>,
  f: () => Parser<I, B>
) => Parser<I, A | B> = P.either as any;

export const lookAheadW: <I, A>(p: Parser<I, A>) => Parser<I, any> =
  P.lookAhead as any;

export const startArray = <I, A>(): Parser<I, A[]> => P.of([]);

export const push =
  <I, B>(val: Parser<I, B>) =>
  <A>(fa: Parser<I, A[]>): Parser<I, (A | B)[]> =>
    pipe(
      fa,
      P.chain((ls) => {
        return pipe(
          val,
          P.map((it) => {
            return [...ls, it];
          })
        );
      })
    );

export const pushWithKey =
  <Key extends string, I, B>(name: Key, val: Parser<I, B>) =>
  <A>(fa: Parser<I, A[]>): Parser<I, (A | [Key, B])[]> => {
    return push(
      pipe(
        val,
        P.map((it) => [name, it] as [Key, B])
      )
    )(fa);
  };

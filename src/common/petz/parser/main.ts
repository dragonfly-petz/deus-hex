import { pipe } from 'fp-ts/function';
import * as P from 'parser-ts/Parser';
import * as S from 'parser-ts/string';
import * as C from 'parser-ts/char';
import { bimap, Either } from 'fp-ts/Either';
import { stream } from 'parser-ts/Stream';
import { and, not } from 'fp-ts/Predicate';
import { eitherW, hSpace, isLineBreak, lineBreak, lookAheadW, notLineBreak } from './util';
import { voidFn } from '../../function';
import { Option } from 'fp-ts/Option';

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

type LineBase<Tag, A> = {
  initialSpaces: string;
  lineContent: A;
  inlineComment: Option<string>;
  tag: Tag
}

function lineParser<Tag, A>(p: P.Parser<string, readonly [Tag, A]>) {
  return pipe(
    S.many(hSpace),
    P.bindTo('initialSpaces'),
    P.bind('lineContent', () => eitherW(
      pipe(lookAheadW(lineBreak), P.map(() => ['raw', ''] as const)),
      () => p
    )),
    P.bind('inlineComment', () => P.optional(inlineCommentParser)),
    P.chainFirst(() => lineBreakOrEof),
    P.map((it) => ({ ...it, tag: it.lineContent[0], lineContent: it.lineContent[1] }))
  ) as P.Parser<string, LineBase<Tag, A> | LineBase<'raw', string>>;
}

const isCommentChar = (c: C.Char) => c === ';';

const inlineCommentParser = pipe(
  S.fold([P.expected(P.sat(isCommentChar), 'a ;'), S.many(notLineBreak)])
);
const lineContentChar: P.Parser<C.Char, C.Char> = P.expected(
  P.sat(and(not(isLineBreak))(not(isCommentChar))),
  'not a line break and not a comment char'
);

const rawLineParser = lineParser(
  pipe(
    S.many(lineContentChar),
    P.map(it => ['raw' as const, it])
  )
);
type RawLine = typeof rawLineParser extends P.Parser<any, infer A> ? A : never;

const sectionHeaderParser = lineParser(pipe(
  C.char('['),
  P.chain(() => C.many(C.notChar(']'))),
  P.chainFirst(() => C.char(']')),
  P.map(it => [
    'section', it
  ] as const)
));
type SectionHeader = typeof sectionHeaderParser extends P.Parser<any, infer A> ? A : never;


function sectionContentLineParser<Tag, A>(p: P.Parser<string, readonly [Tag, A]>) {
  return lineParser(
    pipe(
      P.lookAhead(C.notChar('[')),
      P.chain(() => p)
    )
  );
}

const sectionContentCommentLineParser = sectionContentLineParser(
  pipe(
    S.fold([C.char(';'), C.many(notLineBreak)]),
    P.map(it => ['comment', it] as const)
  )
);

const sectionContentRawLineParser = sectionContentLineParser(
  pipe(
    S.many(lineContentChar),
    P.map(it => ['raw', it] as const)
  )
);


const paintBallzLineParser = sectionContentLineParser(
  pipe(
    S.many(lineContentChar),
    P.map(it => ['paintBall', it] as const)
  )
);
type PaintBallzLine = typeof paintBallzLineParser extends P.Parser<any, infer A>
  ? A
  : never;

const linezLineParser = sectionContentLineParser(
  pipe(
    S.many(lineContentChar),
    P.map(it => ['linez', it] as const)
  )
);
type LinezLine = typeof linezLineParser extends P.Parser<any, infer A>
  ? A
  : never;

const sectionParser = pipe(
  sectionHeaderParser,
  P.chain((line: SectionHeader): P.Parser<string, SectionTypes> => {
    switch (line.lineContent) {
      case 'Paint Ballz':
        return runSection(line, 'paintBallz' as const, paintBallzLineParser);
      case 'Linez':
        return runSection(line, 'linez' as const, linezLineParser);
      default:
        return runSection(line, 'raw' as const, sectionContentRawLineParser);
    }
  })
);

type SectionTypes =
  ReturnType<typeof mkSection<'paintBallz', PaintBallzLine>>
  | ReturnType<typeof mkSection<'linez', LinezLine>>
  | ReturnType<typeof mkSection<'raw', RawLine>>;

function runSection<Tag, A>(
  line: SectionHeader,
  sectionType: Tag,
  parser: P.Parser<string, A>
) {
  return pipe(
    P.many(parser),
    P.map((lines) => mkSection(line, sectionType, lines))
  );
}

function mkSection<Tag, A>(line: SectionHeader,
                           sectionType: Tag,
                           lines: A[]) {

  return {
    ...line,
    sectionType,
    sectionName: line.lineContent,
    lines
  };
}

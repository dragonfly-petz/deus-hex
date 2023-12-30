import { pipe } from 'fp-ts/function';
import * as P from 'parser-ts/Parser';
import * as S from 'parser-ts/string';
import * as C from 'parser-ts/char';
import { bimap, Either } from 'fp-ts/Either';
import { stream } from 'parser-ts/Stream';
import { eitherW } from './util';
import { lineContentChar, lineParser, sectionContentLineParser } from './section';
import { PaintBallzLine, paintBallzLineParser } from './paint-ballz';

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


const sectionContentRawLineParser = sectionContentLineParser(
  pipe(
    S.many(lineContentChar),
    P.map(it => ['raw', it] as const)
  )
);

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

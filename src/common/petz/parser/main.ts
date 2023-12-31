import { pipe } from 'fp-ts/function';
import * as P from 'parser-ts/Parser';
import * as S from 'parser-ts/string';
import * as C from 'parser-ts/char';
import { bimap, Either } from 'fp-ts/Either';
import { stream } from 'parser-ts/Stream';
import { eitherW } from './util';
import {
  baseLineSerializer,
  lineContentChar,
  lineParser,
  LinezName,
  PaintBallzName,
  rawLineParser,
  rawLineSerializer,
  RawParsedLine,
  sectionContentLineParser
} from './section';
import { PaintBallzLine, paintBallzLineParser, paintBallzLineSerialize } from './paint-ballz';
import { LinezLine, linezLineParser, linezLineSerialize } from './linez';
import { isNever } from '../../type-assertion';

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

type ParsedLnz = ReturnType<typeof parseLnz> extends Either<any, infer A> ? A : never
const lnzParser = () =>
  P.manyTill(
    eitherW(sectionParser, () => rawLineParser),
    P.eof()
  );


export function serializeLnz(lnz: ParsedLnz) {
  const parts = new Array<string>();
  for (const line of lnz) {
    switch (line.tag) {
      case 'raw':
        parts.push(rawLineSerializer(line));
        break;
      case 'section':
        parts.push(sectionLineSerializer(line));
        switch (line.sectionType) {
          case 'raw':
            for (const sLine of line.lines) {
              parts.push(rawLineSerializer(sLine));
            }
            break;
          case 'paintBallz':
            for (const sLine of line.lines) {
              parts.push(paintBallzLineSerialize(sLine));
            }
            break;
          case 'linez':
            for (const sLine of line.lines) {
              parts.push(linezLineSerialize(sLine));
            }
            break;
          default:
            isNever(line);
        }
        break;
      default:
        isNever(line);

    }
  }
  return parts.join('');
}

export function findSectionByName(lnz: ParsedLnz, sectionName: string) {
  return lnz.find(it => it.tag === 'section' && it.lineContent == sectionName);
}

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

const sectionParser = pipe(
  sectionHeaderParser,
  P.chain((line: SectionHeader): P.Parser<string, SectionTypes> => {
    switch (line.lineContent) {
      case PaintBallzName:
        return runSection(line, 'paintBallz' as const, paintBallzLineParser);
      case LinezName:
        return runSection(line, 'linez' as const, linezLineParser);
      default:
        return runSection(line, 'raw' as const, sectionContentRawLineParser);
    }
  })
);

type SectionTypes =
  ReturnType<typeof mkSection<'paintBallz', PaintBallzLine>>
  | ReturnType<typeof mkSection<'linez', LinezLine>>
  | ReturnType<typeof mkSection<'raw', RawParsedLine>>;

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

export function sectionLineSerializer(line: SectionTypes) {
  return baseLineSerializer(line, (content) => {
    return `[${content}]`;
  });
}

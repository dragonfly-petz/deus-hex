import { pipe } from 'fp-ts/function';
import * as P from 'parser-ts/Parser';
import * as E from 'fp-ts/Either';
import { bimap, Either } from 'fp-ts/Either';
import * as S from 'parser-ts/string';
import * as C from 'parser-ts/char';
import { stream } from 'parser-ts/Stream';
import { eitherW } from './util';
import {
  AddBallInfoName,
  BallzInfoName,
  baseLineSerializer,
  lineContentChar,
  lineParser,
  LinezName,
  OmissionName,
  PaintBallzName,
  rawLineParser,
  rawLineSerializer,
  RawParsedLine,
  sectionContentLineParser,
} from './section';
import {
  PaintBallzLine,
  paintBallzLineParser,
  paintBallzLineSerialize,
} from './line/paint-ballz';
import { LinezLine, linezLineParser, linezLineSerialize } from './line/linez';
import { isNever } from '../../type-assertion';
import { isNotNully, isNully } from '../../null';
import {
  AddBallContentLine,
  AddBallLine,
  addBallLineParser,
  addBallLineSerialize,
} from './line/add-ball';
import {
  BallzInfoContentLine,
  BallzInfoLine,
  ballzInfoLineParser,
  ballzInfoLineSerialize,
} from './line/ballz-info';
import { FileType } from '../file-types';
import { BallContentLine, BallInfo } from './line/ball-helper';
import {
  OmissionLine,
  omissionLineParser,
  omissionLineSerialize,
} from './line/omission';

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

export function parseLnz(str: string, fileType: FileType | null) {
  return pipe(
    runParser(lnzParser(), str),
    E.map((rawLines) => {
      const ballzArray = addBallNumbersAndCreateBallsArray(rawLines);
      const flat = new Array<ParsedLine>();
      for (const line of rawLines) {
        line.lineIndex = flat.length;
        flat.push(line);
        if (line.tag === 'section') {
          for (const line2 of line.lines) {
            line2.lineIndex = flat.length;
            flat.push(line2);
          }
        }
      }

      return {
        structured: rawLines,
        flat,
        fileType,
        omissionsSet: makeOmissionsSet(rawLines),
        ballz: {
          ballzArray,
          ballInfoMap: new Map<number, Either<string, BallInfo>>([]),
        },
      };
    })
  );
}

function makeOmissionsSet(lines: ParsedLnzStructured) {
  const omissionsSect = findSectionByName(lines, OmissionName);
  if (
    isNully(omissionsSect) ||
    omissionsSect.tag !== 'section' ||
    omissionsSect.sectionType !== 'omission'
  ) {
    return new Set<number>();
  }
  console.log(omissionsSect);
  return new Set(
    omissionsSect.lines
      .map((it) => (it.tag === 'omission' ? it.lineContent.ballRef : null))
      .filter(isNotNully)
  );
}

function addBallNumbersAndCreateBallsArray(lines: ParsedLnzStructured) {
  const ballzInfoSec = findSectionByName(lines, BallzInfoName);
  const addBallzInfoSec = findSectionByName(lines, AddBallInfoName);
  const ballzLines =
    isNotNully(ballzInfoSec) &&
    ballzInfoSec.tag === 'section' &&
    ballzInfoSec.sectionType === 'ballzInfo'
      ? (ballzInfoSec.lines.filter(
          (it) => it.tag === 'ballzInfo'
        ) as BallzInfoContentLine[])
      : [];

  const addBallzLines =
    isNotNully(addBallzInfoSec) &&
    addBallzInfoSec.tag === 'section' &&
    addBallzInfoSec.sectionType === 'addBall'
      ? (addBallzInfoSec.lines.filter(
          (it) => it.tag === 'addBall'
        ) as AddBallContentLine[])
      : [];

  const ballzArray = new Array<BallContentLine>();
  for (const ballLine of [...ballzLines, ...addBallzLines]) {
    ballLine.lineContent.ballId = ballzArray.length;
    ballzArray.push(ballLine);
  }
  return ballzArray;
}

export type ParsedLine = SectionLineTypes | SectionTypes;
export type ParsedLnzStructured = ReturnType<typeof lnzParser> extends P.Parser<
  any,
  infer A
>
  ? A
  : never;

export type ParsedLnzResult = ReturnType<typeof parseLnz>;
export type ParsedLnz = ParsedLnzResult extends Either<any, infer A>
  ? A
  : never;
const lnzParser = () =>
  P.manyTill(
    eitherW(sectionParser, () => rawLineParser),
    P.eof()
  );

export function serializeLnz(lnz: ParsedLnz) {
  const parts = new Array<string>();
  for (const line of lnz.structured) {
    switch (line.tag) {
      case 'raw':
      case 'emptyLine':
      case 'comment':
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
          case 'addBall':
            for (const sLine of line.lines) {
              parts.push(addBallLineSerialize(sLine));
            }
            break;
          case 'ballzInfo':
            for (const sLine of line.lines) {
              parts.push(ballzInfoLineSerialize(sLine));
            }
            break;
          case 'omission':
            for (const sLine of line.lines) {
              parts.push(omissionLineSerialize(sLine));
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

export function findSectionByName(
  lnz: ParsedLnzStructured,
  sectionName: string
) {
  return lnz.find(
    (it) => it.tag === 'section' && it.lineContent === sectionName
  );
}

const sectionHeaderParser = lineParser(
  pipe(
    C.char('['),
    P.chain(() => C.many(C.notChar(']'))),
    P.chainFirst(() => C.char(']')),
    P.map((it) => ['section', it] as const)
  ),
  true
);
type SectionHeader = typeof sectionHeaderParser extends P.Parser<any, infer A>
  ? A
  : never;

const sectionContentRawLineParser = sectionContentLineParser(
  pipe(
    S.many(lineContentChar),
    P.map((it) => ['raw', it] as const)
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
      case AddBallInfoName:
        return runSection(line, 'addBall' as const, addBallLineParser);
      case BallzInfoName:
        return runSection(line, 'ballzInfo' as const, ballzInfoLineParser);
      case OmissionName:
        return runSection(line, 'omission' as const, omissionLineParser);
      default:
        return runSection(line, 'raw' as const, sectionContentRawLineParser);
    }
  })
);
export type PaintBallzSectionType = ReturnType<
  typeof mkSection<'paintBallz', PaintBallzLine>
>;

export type LinezSectionType = ReturnType<typeof mkSection<'linez', LinezLine>>;

export type AddBallSectionType = ReturnType<
  typeof mkSection<'addBall', AddBallLine>
>;
export type BallzInfoSectionType = ReturnType<
  typeof mkSection<'ballzInfo', BallzInfoLine>
>;
export type OmissionSectionType = ReturnType<
  typeof mkSection<'omission', OmissionLine>
>;

export type SectionTypes =
  | PaintBallzSectionType
  | LinezSectionType
  | AddBallSectionType
  | BallzInfoSectionType
  | OmissionSectionType
  | ReturnType<typeof mkSection<'raw', RawParsedLine>>;

export type SectionTypeTag = SectionTypes['sectionType'];

export type SectionLineTypes =
  | PaintBallzLine
  | LinezLine
  | AddBallLine
  | BallzInfoLine
  | OmissionLine
  | RawParsedLine;

export type LineTags = SectionLineTypes['tag'];

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

function mkSection<Tag, A>(line: SectionHeader, sectionType: Tag, lines: A[]) {
  return {
    ...line,
    sectionType,
    sectionName: line.lineContent,
    lines,
  };
}

export function sectionLineSerializer(line: SectionTypes) {
  return baseLineSerializer(line, (content) => {
    return `[${content}]`;
  });
}

import { flatten, lefts, rights } from 'fp-ts/Array';
import { identity } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { isSome } from 'fp-ts/Option';
import { isRawLine, LinezArray } from '../common-types';
import {
  AddBallBreed,
  AddBallClothing,
  clothingCols,
} from '../simple-parser/addballs';
import { unsafeObjectFromEntries } from '../../object';
import { sortByNumeric, tuple } from '../../array';
import { allLineCols, LineDef } from '../simple-parser/lines';
import { isNotNully, isNully } from '../../null';
import {
  findSectionByName,
  LinezSectionType,
  PaintBallzSectionType,
  ParsedLnz,
  parseLnz,
  SectionTypeTag,
  serializeLnz,
} from '../parser/main';
import { LinezName, PaintBallzName } from '../parser/section';
import { FileType } from '../file-types';
import { findInData } from '../parser/line/col-data';

export function transformBreedAddBallsToClothing(
  val: LinezArray<AddBallBreed>
): LinezArray<AddBallClothing> {
  const out: LinezArray<AddBallClothing> = [];
  for (const line of val) {
    if (isRawLine(line)) {
      out.push(line);
    } else {
      const entries = clothingCols.map((it) => {
        return tuple(it, it === 'base' ? 0 : line[it]);
      });
      out.push(unsafeObjectFromEntries(entries));
    }
  }
  return out;
}

export function transformBreedLinesToClothing(
  val: LinezArray<LineDef>
): LinezArray<LineDef> {
  const out: LinezArray<LineDef> = [];
  const linesOnly = val.filter((it) => !isRawLine(it)) as Array<LineDef>;
  if (linesOnly.length < 1) return val;
  const allVals = flatten(linesOnly.map((it) => [it.startBall, it.endBall]));

  sortByNumeric(allVals, identity);
  const smallestBall = allVals[0];

  for (const line of val) {
    if (isRawLine(line)) {
      out.push(line);
    } else {
      const entries = allLineCols.map((it) => {
        const colVal = line[it];
        return tuple(
          it,
          ['startBall', 'endBall'].includes(it) && isNotNully(colVal)
            ? colVal - smallestBall + 1
            : colVal
        );
      });
      // @ts-ignore
      out.push(unsafeObjectFromEntries(entries));
    }
  }
  return out;
}

// some external tools e.g. pet workshop remove some columns of data - anchoring paint balls and in linez for full outlines
export function applyAntiPetWorkshopReplacements(
  original: string,
  externallyModified: string,
  fileType: FileType | null
): E.Either<string, [string, string]> | null {
  const originalLnz = parseLnz(original, fileType);
  if (E.isLeft(originalLnz)) {
    return E.left('Could not parse original lnz');
  }
  const modifiedLnz = parseLnz(externallyModified, fileType);
  if (E.isLeft(modifiedLnz)) {
    return E.left('Could not parse externally modified lnz');
  }
  const lineMessages1 =
    fixPaintBallz(originalLnz.right, modifiedLnz.right) ?? [];
  const lineMessages2 = fixLinez(originalLnz.right, modifiedLnz.right) ?? [];

  const lineMessages = lineMessages1.concat(lineMessages2);
  const errorMessages = lefts(lineMessages.filter(isNotNully));
  if (errorMessages.length > 0) {
    return E.left(errorMessages.join('\n'));
  }
  const paintBallsFixed = rights(lineMessages1.filter(isNotNully)).length;
  const linezFixed = rights(lineMessages2.filter(isNotNully)).length;
  const succMessage = [
    paintBallsFixed > 0
      ? `anchoring reapplied to ${paintBallsFixed} "[Paint Ballz]" lines`
      : null,
    linezFixed > 0
      ? `additional line characteristics reapplied to ${linezFixed} "[Linez]" lines`
      : null,
  ].filter(isNotNully);
  if (succMessage.length > 0) {
    return E.of([succMessage.join('\n'), serializeLnz(modifiedLnz.right)]);
  }
  return null;
}

function findSections(
  originalLnz: ParsedLnz,
  modifiedLnz: ParsedLnz,
  sectionName: string,
  sectionType: SectionTypeTag
) {
  const finder = (lnz: ParsedLnz) => {
    const sec = findSectionByName(lnz.structured, sectionName);
    if (sec?.tag !== 'section' || sec.sectionType !== sectionType) {
      return null;
    }
    return sec;
  };
  const original = finder(originalLnz);
  const modified = finder(modifiedLnz);
  if (isNotNully(original) && isNotNully(modified)) {
    return [original, modified];
  }
  return null;
}

function fixPaintBallz(originalLnz: ParsedLnz, modifiedLnz: ParsedLnz) {
  const secs = findSections(
    originalLnz,
    modifiedLnz,
    PaintBallzName,
    'paintBallz'
  );
  if (isNully(secs)) return null;
  const [originalPaint, modifiedPaint] = secs as PaintBallzSectionType[];

  return modifiedPaint.lines.map((modifiedLine) => {
    if (modifiedLine.tag !== 'paintBall') return null;
    const relevantData = modifiedLine.lineContent.content.filter(
      Array.isArray
    ) as [string, number][];

    const modifiedOptionalColumn = findInData(relevantData, 'optionalColumn');
    if (isNully(modifiedOptionalColumn)) {
      return E.left(`Could not find modified optional column`);
    }
    if (O.isSome(modifiedOptionalColumn[1] as any)) {
      return null;
    }

    const originalLine = originalPaint.lines.find((it) => {
      if (it.tag !== 'paintBall') return false;

      const originalRelevantData = it.lineContent.content.filter(
        Array.isArray
      ) as [string, number][];

      // we  compare the first 11 cols for identity, the 12th is the one we are fixing
      return relevantData
        .slice(0, 11)
        .every((val, i) => val[1] === originalRelevantData[i][1]);
    });

    if (isNully(originalLine) || originalLine.tag !== 'paintBall') return null;

    const originalOptionalColumn = findInData(
      originalLine.lineContent.content,
      'optionalColumn'
    );

    if (
      Array.isArray(originalOptionalColumn) &&
      isSome(originalOptionalColumn[1] as any)
    ) {
      modifiedLine.lineContent.content = [...originalLine.lineContent.content];
      return E.right(true);
    }
    return null;
  });
}

function fixLinez(originalLnz: ParsedLnz, modifiedLnz: ParsedLnz) {
  const secs = findSections(originalLnz, modifiedLnz, LinezName, 'linez');
  if (isNully(secs)) return null;
  const [originalLinez, modifiedLinez] = secs as LinezSectionType[];

  return modifiedLinez.lines.map((modifiedLine) => {
    if (modifiedLine.tag !== 'linez') return null;
    const relevantData = modifiedLine.lineContent.content.filter(
      Array.isArray
    ) as [string, number][];

    const modifiedOptionalColumn1 = findInData(relevantData, 'optionalColumn1');
    const modifiedOptionalColumn2 = findInData(relevantData, 'optionalColumn2');
    if (isNully(modifiedOptionalColumn1) || isNully(modifiedOptionalColumn2)) {
      return E.left(`Could not find modified optional columns `);
    }
    if (
      O.isSome(modifiedOptionalColumn1[1] as any) ||
      O.isSome(modifiedOptionalColumn2[1] as any)
    ) {
      return null;
    }

    const originalLine = originalLinez.lines.find((it) => {
      if (it.tag !== 'linez') return false;

      const originalRelevantData = it.lineContent.content.filter(
        Array.isArray
      ) as [string, number][];

      // we compare the first 8 cols for identity
      return relevantData
        .slice(0, 8)
        .every((val, i) => val[1] === originalRelevantData[i][1]);
    });

    if (isNully(originalLine) || originalLine.tag !== 'linez') return null;

    const originalOptionalColumn1 = findInData(
      originalLine.lineContent.content,
      'optionalColumn1'
    );
    const originalOptionalColumn2 = findInData(
      originalLine.lineContent.content,
      'optionalColumn2'
    );
    if (
      (Array.isArray(originalOptionalColumn1) &&
        isSome(originalOptionalColumn1[1] as any)) ||
      (Array.isArray(originalOptionalColumn2) &&
        isSome(originalOptionalColumn2[1] as any))
    ) {
      modifiedLine.lineContent.content = [...originalLine.lineContent.content];
      return E.right(true);
    }
    return null;
  });
}

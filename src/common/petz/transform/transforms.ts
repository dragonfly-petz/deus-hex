import { flatten, lefts } from 'fp-ts/Array';
import { identity } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
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
import { findSectionByName, parseLnz, serializeLnz } from '../parser/main';
import { PaintBallzName } from '../parser/section';
import { findInData } from '../parser/paint-ballz';

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
  externallyModified: string
): E.Either<string, string> | null {
  const originalLnz = parseLnz(original);
  if (E.isLeft(originalLnz)) {
    return E.left('Could not parse original lnz');
  }
  const modifiedLnz = parseLnz(externallyModified);
  if (E.isLeft(modifiedLnz)) {
    return E.left('Could not parse externally modified lnz');
  }
  const originalPaint = findSectionByName(originalLnz.right, PaintBallzName);
  if (
    originalPaint?.tag !== 'section' ||
    originalPaint.sectionType !== 'paintBallz'
  ) {
    return null;
  }
  const modifiedPaint = findSectionByName(modifiedLnz.right, PaintBallzName);
  if (
    modifiedPaint?.tag !== 'section' ||
    modifiedPaint.sectionType !== 'paintBallz'
  ) {
    return null;
  }
  const lineMessages = modifiedPaint.lines.map((modifiedLine) => {
    if (modifiedLine.tag !== 'paintBall') return null;
    const relevantData = modifiedLine.lineContent.filter(Array.isArray) as [
      string,
      number
    ][];

    const modifiedOptionalColumn = findInData(relevantData, 'optionalColumn');
    if (isNully(modifiedOptionalColumn)) {
      return E.left(`Could not find modified optional column`);
    }
    if (O.isSome(modifiedOptionalColumn[1] as any)) {
      return null;
    }

    const originalLine = originalPaint.lines.find((it) => {
      if (it.tag !== 'paintBall') return false;

      const originalRelevantData = it.lineContent.filter(Array.isArray) as [
        string,
        number
      ][];

      // we  compare the first 11 cols for identity, the 12th is the one we are fixing
      return relevantData
        .slice(0, 11)
        .every((val, i) => val[1] === originalRelevantData[i][1]);
    });

    if (isNully(originalLine) || originalLine.tag !== 'paintBall') return null;

    const originalOptionalColumn = findInData(
      originalLine.lineContent,
      'optionalColumn'
    );
    if (
      isNotNully(originalOptionalColumn) &&
      Array.isArray(originalOptionalColumn) &&
      O.isSome(originalOptionalColumn[1] as any)
    ) {
      // we check for equality in all the other fields, so we simply replace the new line with the old line (this will overwrite any spacing changes made externally)
      modifiedLine.lineContent = [...originalLine.lineContent];
    }
    return null;
  });
  const errorMessages = lefts(lineMessages.filter(isNotNully));
  if (errorMessages.length > 0) {
    return E.left(errorMessages.join('\n'));
  }
  return E.of(serializeLnz(modifiedLnz.right));
}

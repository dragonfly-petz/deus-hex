import { flatten } from 'fp-ts/Array';
import { identity } from 'fp-ts/function';
import { isRawLine, LinezArray } from '../common-types';
import {
  AddBallBreed,
  AddBallClothing,
  clothingCols,
} from '../parser/addballs';
import { unsafeObjectFromEntries } from '../../object';
import { sortByNumeric, tuple } from '../../array';
import { allLineCols, LineDef } from '../parser/lines';
import { isNotNully } from '../../null';

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
export function copyMissingColumns(from: string, _to: string) {
  return from;
}

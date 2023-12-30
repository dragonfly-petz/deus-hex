import { Either } from 'fp-ts/Either';
import { flatten } from 'fp-ts/Array';
import {
  isRawLine,
  LinezArray,
  LinezOutput,
  rawLine,
  RecordFromCols,
} from '../common-types';
import { safeGet } from '../../array';
import { isNotNully, isNully } from '../../null';
import { E } from '../../fp-ts/fp';
import { nestErr, pInt } from './common';
import { unsafeObjectFromEntries } from '../../object';

export const clothingCols = [
  'base',
  'x',
  'y',
  'z',
  'color',
  'otlnCol',
  'fuzz',
  'group',
  'outline',
  'ballsize',
  'texture',
] as const;
type ClothingCol = typeof clothingCols[number];
export type AddBallClothing = RecordFromCols<ClothingCol>;

export const breedCols = [
  'base',
  'x',
  'y',
  'z',
  'color',
  'otlnCol',
  'spckCol',
  'fuzz',
  'group',
  'outline',
  'ballsize',
  'bodyarea',
  'addGroup',
  'texture',
] as const;
type BreedCol = typeof breedCols[number];
export type AddBallBreed = RecordFromCols<BreedCol>;

export function parseAddBallsBreed(
  text: string
): Either<string, LinezArray<AddBallBreed>> {
  return parseWithCols(text, breedCols, []);
}

export function parseWithCols<
  Col extends PropertyKey,
  OptCol extends PropertyKey
>(
  text: string,
  cols: ReadonlyArray<Col>,
  optionalCols: ReadonlyArray<OptCol>
): Either<string, LinezArray<RecordFromCols<Col, OptCol>>> {
  const lines = text.split('\n');
  const out: LinezArray<RecordFromCols<Col, OptCol>> = [];
  for (const line of lines) {
    const parsed = parseCols(cols, optionalCols, line);
    if (E.isLeft(parsed)) return parsed;
    out.push(parsed.right);
  }
  return E.right(out);
}

export function parseCols<Col extends PropertyKey, OptCol extends PropertyKey>(
  cols: ReadonlyArray<Col>,
  optionalCols: ReadonlyArray<OptCol>,
  line: string
): Either<string, LinezOutput<RecordFromCols<Col, OptCol>>> {
  if (line[0] === ';') return E.right(rawLine(line));
  const split = line.split(/\s+/);
  const entries = new Array<[Col | OptCol, number]>();
  for (const [idx, colName] of cols.entries()) {
    const val = safeGet(split, idx);
    if (isNully(val)) {
      return E.left(
        `Expected to find a value at column ${idx} (${String(
          colName
        )}) in line "${line}"`
      );
    }
    const num = pInt(val);
    if (E.isLeft(num)) {
      return nestErr(
        num,
        `Failed parsing ${idx} (${String(colName)}) in line "${line}"`
      );
    }
    entries.push([colName, num.right]);
  }
  for (const [idx, colName] of optionalCols.entries()) {
    const actualIdx = cols.length + idx;
    const val = safeGet(split, actualIdx);
    if (isNully(val)) break;
    const num = pInt(val);
    if (E.isLeft(num)) {
      return nestErr(
        num,
        `Failed parsing ${idx} (${String(colName)}) in line "${line}"`
      );
    }
    entries.push([colName, num.right]);
  }
  return E.right(unsafeObjectFromEntries(entries));
}

export function serializeClothingAddBalls(
  val: LinezArray<AddBallClothing>
): string {
  return serializeWithCols(clothingCols, [], val);
}

export function serializeWithCols<A>(
  cols: ReadonlyArray<keyof A>,
  optionalCols: ReadonlyArray<keyof A>,
  val: LinezArray<A>
): string {
  const linesSer = val.map((it) => {
    if (isRawLine(it)) {
      return it.value;
    }
    const reqVals = cols.map((colName) => {
      return it[colName];
    });
    const optVals = optionalCols
      .map((colName) => {
        if (isNully(it[colName])) {
          return null;
        }
        return it[colName];
      })
      .filter(isNotNully);
    return flatten([reqVals, optVals]).join(',    ');
  });
  return linesSer.join('\n');
}

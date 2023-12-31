import { Either } from 'fp-ts/Either';
import { flatten } from 'fp-ts/ReadonlyArray';
import { LinezArray, RecordFromCols } from '../common-types';
import { parseWithCols, serializeWithCols } from './addballs';

export const lineCols = [
  'startBall',
  'endBall',
  'fuzz',
  'colour',
  'leftColour',
  'rightColour',
  'startThickness',
  'endThickness',
] as const;
type LineCol = (typeof lineCols)[number];
export const lineColsOptional = [
  'lineAdditionalOne',
  'lineAdditionalTwo',
] as const;
export const allLineCols = flatten([lineCols, lineColsOptional]);
type LineColOptional = (typeof lineColsOptional)[number];

export type LineDef = RecordFromCols<LineCol, LineColOptional>;

export function parseLines(text: string): Either<string, LinezArray<LineDef>> {
  return parseWithCols(text, lineCols, lineColsOptional);
}

export function serializeLines(val: LinezArray<LineDef>): string {
  return serializeWithCols(lineCols, lineColsOptional, val);
}

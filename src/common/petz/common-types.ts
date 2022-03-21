import { isObjectWithKey } from '../type-assertion';

export interface RawLine {
  tag: 'rawLine';
  value: string;
}

export function isRawLine(val: unknown): val is RawLine {
  return isObjectWithKey(val, 'tag') && val.tag === 'rawLine';
}

export function rawLine(value: string): RawLine {
  return {
    tag: 'rawLine',
    value,
  };
}

export type LinezArray<A> = Array<LinezOutput<A>>;
export type LinezOutput<A> = A | RawLine;

export type RecordFromCols<
  Col extends PropertyKey,
  OptionalCol extends PropertyKey = never
> = Record<Col, number> & {
  [P in OptionalCol]?: number;
};

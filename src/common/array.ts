export function safeGet<A>(array: ReadonlyArray<A>, idx: number): A | null {
  return array[idx] ?? null;
}

export function safeHead<A>(array: ReadonlyArray<A>): A | null {
  return array[0] ?? null;
}

export function safeLast<A>(array: ReadonlyArray<A>): A | null {
  if (array.length < 1) return null;
  return array[array.length - 1];
}

export function tuple<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}

export function fst<A, B>(val: [A, B]) {
  return val[0];
}

export function snd<A, B>(val: [A, B]) {
  return val[1];
}

export const numericComparer: Comparer<number> = (a1, a2) =>
  (a1 - a2) as ComparisonResult;
export const stringComparer: Comparer<string> = (a1, a2) =>
  a1.localeCompare(a2) as ComparisonResult;

export function sortByNumeric<A, B extends number>(
  array: Array<A>,
  by: (arg: A) => B
): void {
  const func = mkSortByComparer(by, numericComparer);
  array.sort(func);
}

export function sortByDate<A>(array: Array<A>, by: (arg: A) => Date): void {
  const func = mkSortByComparer((it: A) => by(it).getTime(), numericComparer);
  array.sort(func);
}

export function sortByString<A, B extends string>(
  array: Array<A>,
  by: (arg: A) => B
): void {
  const func = mkSortByComparer(by, stringComparer);
  array.sort(func);
}

type ComparisonResult = -1 | 0 | 1;

export type Comparer<A> = (a1: A, a2: A) => ComparisonResult;

export function mkSortByComparer<A, B>(
  by: (arg: A) => B,
  comparer: Comparer<B>
): Comparer<A> {
  return (a1, a2) => comparer(by(a1), by(a2));
}

export function sum(value: Array<number>) {
  return sumBy(value, (it) => it);
}

export function sumBy<A>(value: ReadonlyArray<A>, by: (a: A) => number) {
  return value.reduce((accum, val) => accum + by(val), 0);
}

export const includesNarrowing = <A extends readonly any[]>(
  array: A,
  value: unknown
): value is A[number] => array.includes(value);

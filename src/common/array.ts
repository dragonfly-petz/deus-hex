export function safeGet<A>(array: ReadonlyArray<A>, idx: number): A | null {
  return array[idx] ?? null;
}

export function safeHead<A>(array: ReadonlyArray<A>): A | null {
  return array[0] ?? null;
}

export function tuple<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}

export const numericComparer: Comparer<number> = (a1, a2) =>
  (a1 - a2) as ComparisonResult;

export function sortByNumeric<A, B extends number>(
  array: Array<A>,
  by: (arg: A) => B
): void {
  const func = mkSortByComparer(by, numericComparer);
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

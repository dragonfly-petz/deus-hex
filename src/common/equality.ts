import equal from 'fast-deep-equal/es6';

export const deepEqual = equal;

export type EqualityCheck<A> = (a: A, b: A) => boolean;

export function strictEqualityCheck<A>(a: A, b: A) {
  return a === b;
}

export function deepEqualityCheck<A>(a: A, b: A) {
  return deepEqual(a, b);
}

export function mkArrayEqualityCheck<A>(
  equalityCheck: EqualityCheck<A>,
  a: ReadonlyArray<A>,
  b: ReadonlyArray<A>
) {
  return (
    a.length === b.length && a.every((val, idx) => equalityCheck(val, b[idx]))
  );
}

export function equalElements<A>(a: ReadonlyArray<A>, b: ReadonlyArray<A>) {
  return mkArrayEqualityCheck(strictEqualityCheck, a, b);
}

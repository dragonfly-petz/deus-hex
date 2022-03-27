import equal from 'fast-deep-equal/es6';

export const deepEqual = equal;

export type EqualityCheck<A> = (a: A, b: A) => boolean;

export function strictEqualityCheck<A>(a: A, b: A) {
  return a === b;
}

export function deepEqualityCheck<A>(a: A, b: A) {
  return deepEqual(a, b);
}

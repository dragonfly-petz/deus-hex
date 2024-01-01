import * as O from 'fp-ts/Option';

export function isNotNully<A>(value: A | null | undefined): value is A {
  return value !== null && value !== undefined;
}

export function isNully<A>(
  value: A | null | undefined
): value is null | undefined {
  return value === null || value === undefined;
}

export function nullable<T>(t?: T): T | null {
  if (isNully(t)) {
    return null;
  }
  return t;
}

export function none<A>(): O.Option<A> {
  return O.none;
}

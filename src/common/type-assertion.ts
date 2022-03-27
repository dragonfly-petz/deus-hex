import { assertEqual } from './assert';

export function isObjectWithKey<K extends keyof any>(
  value: unknown,
  k: K
): value is Record<K, any> {
  return typeof value === 'object' && value !== null && (k as any) in value;
}

export function assertTypesEqual<A, B>(c: AssertEqual<A, B>) {
  assertEqual(c, true, 'Type assertion failed');
}

export type AssertEqual<A, B> = A extends B
  ? B extends A
    ? true
    : false
  : false;

export function isNever(_value: never): never {
  throw new Error(
    `isNever failed: ${JSON.stringify(
      _value
    )} (${typeof _value}) is not assignable to never`
  );
}

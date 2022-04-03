export const unsafeObjectFromEntries = <K extends PropertyKey, T>(
  entries: Iterable<readonly [K, T]>
) => Object.fromEntries(entries) as Record<K, T>;

export type EntryTuples<T> = T extends any
  ? { [P in keyof T]-?: [P, T[P]] }[keyof T]
  : never;
export const unsafeObjectEntries = <R extends object>(record: R) =>
  Object.entries(record) as unknown as Array<EntryTuples<R>>;

export const mapObjectValues = <R extends object, B>(
  record: R,
  mapper: (value: R[keyof R]) => B
) =>
  objectFromEntries(
    unsafeObjectEntries(record).map(([k, v]) => [k, mapper(v)])
  ) as Record<keyof R, B>;

export function pick<T extends object, A extends readonly (keyof T)[]>(
  a: OnlyStringKeys<T>,
  keys: A
): Pick<T, A[number]> {
  return objectFromEntries(
    objectEntries(a).filter(([key, _]) => keys.includes(key as any))
  ) as any;
}

export const mapObjectValuesStringKey = <R extends object, B>(
  record: OnlyStringKeys<R>,
  mapper: (value: R[keyof R], key: keyof R) => B
) =>
  objectFromEntries(
    objectEntries(record).map(([k, v]) => [k, mapper(v, k)])
  ) as Record<keyof R, B>;

export const objectFromEntries = <K extends PropertyKey, T>(
  entries: Iterable<readonly [K, T]>
) => Object.fromEntries(entries) as Partial<Record<K, T>>;

export type OnlyStringKeys<R> = keyof R extends string ? R : never;

export const objectEntries = <R extends object>(record: OnlyStringKeys<R>) =>
  Object.entries(record) as unknown as Array<EntryTuples<R>>;

type ValueOf<T> = T extends any ? T[keyof T] : never;

export const objectValues = <R extends object>(record: R) =>
  Object.values(record) as Array<ValueOf<R>>;

type NumericValueKey<A, Key extends keyof A> = A[Key] extends number
  ? Key
  : never;
export type NumericValueKeys<A extends object> = {
  [K in keyof A]: NumericValueKey<A, K>;
}[keyof A];

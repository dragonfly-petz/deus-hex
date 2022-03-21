export const unsafeObjectFromEntries = <K extends PropertyKey, T>(
  entries: Iterable<readonly [K, T]>
) => Object.fromEntries(entries) as Record<K, T>;

type EntryTuples<T> = T extends any
  ? { [P in keyof T]-?: [P, T[P]] }[keyof T]
  : never;
export const unsafeObjectEntries = <R extends object>(record: R) =>
  Object.entries(record) as unknown as Array<EntryTuples<R>>;

export const unsafeObjectFromEntries = <K extends PropertyKey, T>(
  entries: Iterable<readonly [K, T]>
) => Object.fromEntries(entries) as Record<K, T>;

export function isObjectWithKey<K extends keyof any>(
  value: unknown,
  k: K
): value is Record<K, any> {
  return typeof value === 'object' && value !== null && (k as any) in value;
}

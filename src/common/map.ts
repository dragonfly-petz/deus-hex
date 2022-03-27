export function getOrPut<K, V>(
  map: MapLike<K, V>,
  key: K,
  produceDefaultValue: (key2: K) => V
) {
  const current = map.get(key);
  if (current !== undefined) {
    return current;
  }
  const defaultValue = produceDefaultValue(key);
  map.set(key, defaultValue);
  return defaultValue;
}

interface MapLike<K, V> {
  get(key: K): V | undefined;

  set(key: K, value: V): MapLike<K, V> | void;
}

export function getAndModifyOrPut<K, V, P extends V>(
  map: MapLike<K, V>,
  key: K,
  modifier: (value: V) => P,
  produceDefaultValue: () => P
) {
  const current = map.get(key);
  if (current !== undefined) {
    const newVal = modifier(current);
    map.set(key, newVal);
    return newVal;
  }
  const defaultValue = produceDefaultValue();
  map.set(key, defaultValue);
  return defaultValue;
}

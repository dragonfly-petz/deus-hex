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

export function mapMapValue<K, A, B>(
  map: Map<K, A>,
  func: (a: A, k: K) => B
): Map<K, B> {
  const outMap = new Map<K, B>();
  for (const [key, value] of map.entries()) {
    outMap.set(key, func(value, key));
  }
  return outMap;
}

export function arrayToMapBy<K, V>(
  arra: Array<V>,
  by: (v: V) => K
): Map<K, Array<V>> {
  const result = new Map<K, Array<V>>();
  for (const item of arra) {
    const key = by(item);
    const arr = result.get(key);
    if (arr) {
      arr.push(item);
    } else {
      result.set(key, [item]);
    }
  }
  return result;
}

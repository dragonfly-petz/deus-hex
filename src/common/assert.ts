export function assert(bool: boolean, msg: string) {
  if (bool) return;
  throw new Error(`Assertion failed: ${msg}`);
}

export function assertEqual<A>(a: A, b: A, msg?: string) {
  if (a === b) return;
  throw new Error(`${msg} Assertion failed: Expected ${a} === ${b}`);
}

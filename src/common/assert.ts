export function assert(bool: boolean, msg: string) {
  if (bool) return;
  throw new Error(`Assertion failed: ${msg}`);
}

export function assertEqual<A>(a: A, b: A, msg?: string) {
  if (a === b) return;
  const msgR = msg ?? '';
  throw new Error(`${msgR} Assertion failed: Expected ${a} === ${b}`);
}

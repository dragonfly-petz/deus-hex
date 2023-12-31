type Arr = readonly unknown[];

export function partialCall<T extends Arr, U extends Arr, R>(
  f: (...args: [...T, ...U]) => R,
  ...headArgs: T
) {
  return (...b: U) => f(...headArgs, ...b);
}

export function run<A>(block: () => A) {
  return block();
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function voidFn() {}

export function identity<A>(a: A): A {
  return a;
}

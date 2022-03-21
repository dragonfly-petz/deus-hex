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

export function voidFn() {}

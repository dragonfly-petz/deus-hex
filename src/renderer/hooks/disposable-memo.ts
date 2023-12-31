import { useEffect, useRef } from 'react';
import { equalElements, EqualityCheck } from '../../common/equality';
import { isNully } from '../../common/null';
import { voidFn } from '../../common/function';

export function useMemoWithDeps<A, Deps extends ReadonlyArray<any>>(
  setup: (setupDeps: Deps) => A,
  deps: Deps,
  equalityCheck: EqualityCheck<Deps> = equalElements
) {
  return useDisposableMemoWithDeps(
    (it) => [setup(it), voidFn],
    deps,
    equalityCheck
  );
}

export function useDisposableMemoWithDeps<A, Deps extends ReadonlyArray<any>>(
  setup: (setupDeps: Deps) => readonly [A, () => void],
  deps: Deps,
  equalityCheck: EqualityCheck<Deps> = equalElements
) {
  const stateRef = useRef<{
    deps: Deps;
    returnVal: readonly [A, () => void];
  }>(undefined as any);
  if (isNully(stateRef.current)) {
    stateRef.current = {
      deps,
      returnVal: setup(deps),
    };
  }
  // dispose when removed from dom
  useEffect(() => stateRef.current.returnVal[1], []);

  if (!equalityCheck(stateRef.current.deps, deps)) {
    stateRef.current.returnVal[1]();
    stateRef.current.deps = deps;
    stateRef.current.returnVal = setup(deps);
  }
  return stateRef.current.returnVal[0];
}

export function useAsyncDisposableMemoWithDeps<
  A,
  Deps extends ReadonlyArray<any>
>(
  setup: (setupDeps: Deps) => Promise<readonly [A, () => void]>,
  deps: Deps,
  equalityCheck: EqualityCheck<Deps> = equalElements
): Promise<A> {
  const stateRef = useRef<{
    deps: Deps;
    promise: Promise<readonly [A, () => void]>;
  }>(undefined as any);

  if (isNully(stateRef.current)) {
    stateRef.current = {
      deps,
      promise: setup(deps),
    };
  }
  // dispose when removed from dom
  useEffect(
    () => () => {
      // eslint-disable-next-line promise/catch-or-return
      stateRef.current.promise.then((it) => it[1]());
    },
    []
  );

  if (!equalityCheck(stateRef.current.deps, deps)) {
    stateRef.current.promise = stateRef.current.promise.then((it) => {
      it[1]();
      return setup(deps);
    });
    stateRef.current.deps = deps;
  }
  return stateRef.current.promise.then((it) => it[0]);
}

export function useDisposableMemo<A>(setup: () => [A, () => void]) {
  return useDisposableMemoWithDeps(setup, []);
}

export function useDisposableEffectWithDeps<Deps extends ReadonlyArray<any>>(
  setup: (deps1: Deps) => () => void,
  deps: Deps
) {
  return useDisposableMemoWithDeps((depsInner) => {
    const disp = setup(depsInner);
    return [undefined, disp];
  }, deps);
}

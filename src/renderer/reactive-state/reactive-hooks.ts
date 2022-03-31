import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import { ChangeListener } from '../../common/reactive/listener';
import { ReactiveVal } from '../../common/reactive/reactive-interface';
import { isNully, nullable } from '../../common/null';
import { Disposer } from '../../common/disposable';
import { run } from '../../common/function';

export function useMkReactiveNodeMemo<A>(initialVal: A) {
  // we specifically don't want this to be recreated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new ReactiveNode(initialVal), []);
}

export function useReactiveVal<A>(node: ReactiveVal<A>, _debugLabel?: string) {
  const [, setRerenderState] = useState(0);

  const disposerRef = useRef({
    node,
    disposer: nullable<Disposer>(),
  });
  if (
    isNully(disposerRef.current.disposer) ||
    node !== disposerRef.current.node
  ) {
    disposerRef.current.disposer?.();
    disposerRef.current.node = node;
    disposerRef.current.disposer = node.listenable.listen(() => {
      setRerenderState((it) => it + 1);
    });
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => disposerRef.current.disposer?.();
  }, []);

  return node.getValue();
}

export function useListenReactiveVal<A>(
  node: ReactiveVal<A>,
  listener: ChangeListener<A>
) {
  useEffect(() => {
    return node.listenable.listen(listener);
  }, [node, listener]);
}

export function useSequenceMap<A, B>(
  map: ReactiveVal<Map<A, ReactiveNode<B>>>
): ReactiveVal<Map<A, B>> {
  const mapFromSource = useCallback(
    () =>
      new Map<A, B>(
        Array.from(map.getValue().entries()).map((it) => [
          it[0],
          it[1].getValue(),
        ])
      ),
    [map]
  );

  const returnVal = useMemo(() => {
    return new ReactiveNode(mapFromSource());
  }, [mapFromSource]);

  useEffect(() => {
    const updateVal = () => {
      returnVal.setValue(mapFromSource());
    };
    const valDisposers = new Array<Disposer>();
    const baseDisposer = map.listenable.listen(() => {
      valDisposers.forEach(run);
      for (const val of map.getValue().values()) {
        valDisposers.push(val.listenable.listen(updateVal));
      }
      updateVal();
    });

    for (const val of map.getValue().values()) {
      valDisposers.push(val.listenable.listen(updateVal));
    }
    return () => {
      baseDisposer();
      valDisposers.forEach(run);
    };
  }, [map, returnVal, mapFromSource]);

  return returnVal;
}

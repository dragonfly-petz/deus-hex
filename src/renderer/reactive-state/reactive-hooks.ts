import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import { ChangeListener } from '../../common/reactive/listener';
import { ReactiveVal } from '../../common/reactive/reactive-interface';
import { isNully, nullable } from '../../common/null';
import { Disposer } from '../../common/disposable';

export function useMkReactiveNodeMemo<A>(initialVal: A) {
  // we specifically don't want this to be recreated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new ReactiveNode(initialVal), []);
}

export function useReactiveVal<A>(node: ReactiveVal<A>) {
  const [, setRerenderState] = useState(0);

  const disposerRef = useRef({
    node,
    disposer: nullable<Disposer>(),
  });
  if (
    isNully(disposerRef.current.disposer) ||
    node !== disposerRef.current.node
  ) {
    disposerRef.current.node = node;
    disposerRef.current.disposer = node.listenable.listen(() => {
      setRerenderState((it) => it + 1);
    });
  }
  useEffect(() => {
    return () => disposerRef.current.disposer?.();
  }, [node]);

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

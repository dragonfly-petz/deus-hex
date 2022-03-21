import { useEffect, useMemo, useState } from 'react';
import { ReactiveNode, ReactiveNodeListener } from './reactive-node';

export function useMkReactiveNode<A>(val: A) {
  return new ReactiveNode(val);
}

export function useMkReactiveNodeMemo<A>(initialVal: A) {
  // we specifically don't want this to be recreated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new ReactiveNode(initialVal), []);
}

export function useReactiveNode<A>(node: ReactiveNode<A>) {
  const [, setRerenderState] = useState(0);
  useEffect(() => {
    return node.listen(() => {
      setRerenderState((it) => it + 1);
    });
  }, [node]);

  return node.getValue();
}

export function useListenReactiveNode<A>(
  node: ReactiveNode<A>,
  listener: ReactiveNodeListener<A>
) {
  useEffect(() => {
    return node.listen(listener);
  }, [node, listener]);
}

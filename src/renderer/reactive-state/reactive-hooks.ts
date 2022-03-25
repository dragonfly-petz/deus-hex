import { useEffect, useMemo, useState } from 'react';
import { ReactiveNode, ReactiveVal } from '../../common/reactive/reactive-node';
import { ChangeListener } from '../../common/reactive/listener';

export function useMkReactiveNodeMemo<A>(initialVal: A) {
  // we specifically don't want this to be recreated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new ReactiveNode(initialVal), []);
}

export function useReactiveVal<A>(node: ReactiveVal<A>) {
  const [, setRerenderState] = useState(0);
  useEffect(() => {
    return node.listenable.listen(() => {
      setRerenderState((it) => it + 1);
    });
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

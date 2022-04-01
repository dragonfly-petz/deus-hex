import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import { ChangeListener } from '../../common/reactive/listener';
import { ReactiveVal } from '../../common/reactive/reactive-interface';
import { isNully, nullable } from '../../common/null';
import { Disposer } from '../../common/disposable';
import { ReactiveSequence } from '../../common/reactive/reactive-sequence';
import { isObjectWithKey } from '../../common/type-assertion';
import { O, Option } from '../../common/fp-ts/fp';

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
    disposerRef.current.disposer = node.listen(() => {
      setRerenderState((it) => it + 1);
    }, false);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => disposerRef.current.disposer?.();
  }, []);

  return node.getValue();
}

export function useListenReactiveVal<A>(
  node: ReactiveVal<A>,
  listener: ChangeListener<A>,
  callImmediately = false
) {
  useEffect(() => {
    return node.listen(listener, callImmediately);
  }, [node, listener, callImmediately]);
}

export function sequenceReactiveArray<A>(
  nodes: ReadonlyArray<ReactiveVal<A>>
): ReactiveVal<Array<A>> {
  return new ReactiveSequence(nodes);
}

export function isReactiveVal(val: unknown): val is ReactiveVal<any> {
  return isObjectWithKey(val, 'listen') && isObjectWithKey(val, 'getValue');
}

export type ReactiveOrConstant<A> = ReactiveVal<A> | A;
export type ReactiveOrConstantOption<A> =
  | ReactiveVal<Option<A>>
  | A
  | undefined;

export function toReactiveValOption<A>(
  val: ReactiveOrConstantOption<A>
): ReactiveVal<Option<A>> {
  if (isReactiveVal(val)) return val;
  return new ReactiveNode(O.fromNullable(val));
}

export function toReactiveVal<A>(val: ReactiveOrConstant<A>): ReactiveVal<A> {
  if (isReactiveVal(val)) return val;
  return new ReactiveNode(val);
}

export function useReactiveOrConstant<A>(val: ReactiveOrConstant<A>): A {
  return useReactiveVal(toReactiveVal(val));
}

export function useReactiveOrConstantOption<A>(
  val: ReactiveOrConstantOption<A>
): Option<A> {
  return useReactiveVal(toReactiveValOption(val));
}

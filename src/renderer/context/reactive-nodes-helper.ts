import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { AppReactiveNodes, useAppReactiveNodes } from './context';
import { ReactiveVal } from '../../common/reactive/reactive-interface';

export function useAppReactiveNode<A>(
  fn: (it: AppReactiveNodes) => ReactiveVal<A>
): A {
  return useReactiveVal(fn(useAppReactiveNodes()));
}

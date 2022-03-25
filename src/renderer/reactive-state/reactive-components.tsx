import { ReactiveNode } from '../../common/reactive/reactive-node';
import { RenderFunction } from '../framework/render';
import { useReactiveVal } from './reactive-hooks';

export function WithReactiveNode<A>({
  node,
  render,
}: {
  node: ReactiveNode<A>;
  render: RenderFunction<{ value: A }>;
}) {
  const result = useReactiveVal(node);
  return render({ value: result });
}

export function RenderRenderFunc<A>({
  renderFunc,
  arg,
}: {
  renderFunc: RenderFunction<A>;
  arg: A;
}) {
  return renderFunc(arg);
}

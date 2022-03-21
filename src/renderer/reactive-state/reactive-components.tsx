import { ReactiveNode } from './reactive-node';
import { RenderFunction } from '../framework/render';
import { useReactiveNode } from './reactive-hooks';

export function WithReactiveNode<A>({
  node,
  render,
}: {
  node: ReactiveNode<A>;
  render: RenderFunction<{ value: A }>;
}) {
  const result = useReactiveNode(node);
  return render({ value: result });
}

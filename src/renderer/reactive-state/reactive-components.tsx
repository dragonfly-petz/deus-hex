import { RenderFunction } from '../framework/render';
import { useReactiveVal } from './reactive-hooks';
import { ReactiveVal } from '../../common/reactive/reactive-interface';

export function WithReactiveVal<A>({
  node,
  render,
}: {
  node: ReactiveVal<A>;
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

import { RenderFunction } from '../framework/render';
import { WithReactiveVal } from './reactive-components';
import { ReactiveVal } from '../../common/reactive/reactive-interface';

export function renderReactive<A>(
  val: ReactiveVal<A>,
  render: RenderFunction<A>
) {
  return <WithReactiveVal node={val} render={(it) => render(it.value)} />;
}

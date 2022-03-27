import { Result } from '../../common/result';
import { renderEither, RenderFunction, renderNullable } from './render';
import style from './result.module.scss';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import {
  RenderRenderFunc,
  WithReactiveNode,
} from '../reactive-state/reactive-components';

export function renderResult<A>(
  result: Result<A> | null,
  render: RenderFunction<A>
) {
  return renderNullable(result, (res) => {
    return renderEither(
      res,
      (err) => {
        return <div className={style.error}>{err}</div>;
      },
      (output) => {
        return <RenderRenderFunc renderFunc={render} arg={output} />;
      }
    );
  });
}

export function renderReactiveResult<A>(
  result: ReactiveNode<Result<A> | null>,
  render: RenderFunction<A>
) {
  return (
    <WithReactiveNode
      node={result}
      render={(res) => {
        return renderResult(res.value, render);
      }}
    />
  );
}

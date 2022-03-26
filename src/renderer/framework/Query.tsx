import { useMemo } from 'react';
import { E, Either } from '../../common/fp-ts/fp';
import { ReactiveVal } from '../../common/reactive/reactive-node';
import { Listenable } from '../../common/reactive/listener';
import { emptyComponent, FunctionalComponent } from './render';
import style from './Query.module.scss';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { isNever } from '../../common/type-assertion';
import { Icon } from './Icon';
import { classNames } from '../../common/react';

export type QueryResult<A> = Either<string, A>;

export type QueryState<A> =
  | {
      tag: 'pending';
    }
  | {
      tag: 'success';
      value: A;
    }
  | {
      tag: 'error';
      value: string;
    };

export class Query<A> implements ReactiveVal<QueryState<A>> {
  readonly listenable = new Listenable<[QueryState<A>, QueryState<A>]>();

  private queryState: QueryState<A> = {
    tag: 'pending',
  };

  constructor(private query: () => Promise<QueryResult<A>>) {
    this.runQuery();
  }

  private async runQuery() {
    this.setState({ tag: 'pending' });
    const res = await this.query();
    if (E.isLeft(res)) {
      this.setState({ tag: 'error', value: res.left });
    } else {
      this.setState({ tag: 'success', value: res.right });
    }
  }

  private setState(st: QueryState<A>) {
    const old = this.queryState;
    this.queryState = st;
    this.listenable.notify(st, old);
  }

  getValue(): QueryState<A> {
    return this.queryState;
  }

  async reload() {
    return this.runQuery();
  }
}

export function useMkQueryMemo<A>(query: () => Promise<QueryResult<A>>) {
  // we specifically don't want this to be recreated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new Query(query), []);
}

export const RenderQuery = <A,>({
  query,
  OnSuccess,
  AdditionalOnError = emptyComponent,
}: {
  query: Query<A>;
  OnSuccess: FunctionalComponent<{ value: A }>;
  AdditionalOnError?: FunctionalComponent;
}) => {
  const queryState = useReactiveVal(query);
  switch (queryState.tag) {
    case 'pending':
      return (
        <div className={classNames(style.panel, style.pending)}>
          <div className={style.icon}>
            <Icon icon="faSpinner" />
          </div>
          <div className={style.message}>Loading</div>
        </div>
      );
    case 'error':
      return (
        <>
          <div className={classNames(style.panel, style.error)}>
            <div className={style.icon}>
              <Icon icon="faExclamationTriangle" />
            </div>
            <div className={style.message}>Error: {queryState.value}</div>
          </div>
          <AdditionalOnError />
        </>
      );
    case 'success':
      return <OnSuccess value={queryState.value} />;
    default:
      return isNever(queryState);
  }
};

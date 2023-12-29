import { DependencyList, useMemo } from 'react';
import { E, Either } from '../../common/fp-ts/fp';
import {
  ChangeListener,
  Listenable,
  toChangeVal,
} from '../../common/reactive/listener';
import {
  emptyComponent,
  FunctionalComponent,
  renderLineBreaks,
} from './render';
import style from './Query.module.scss';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { isNever } from '../../common/type-assertion';
import { Icon } from './Icon';
import { classNames } from '../../common/react';
import { ReactiveVal } from '../../common/reactive/reactive-interface';
import { EqualityCheck } from '../../common/equality';
import { fmapHelper } from '../../common/reactive/reactive-fmap';
import { Disposer } from '../../common/disposable';

export type QueryResult<A> = Either<string, A>;
export type QueryInner<A extends Query<any>> = A extends Query<infer Inner>
  ? Inner
  : never;

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
  private readonly listenable = new Listenable<
    [QueryState<A>, QueryState<A>]
  >();

  private queryState: QueryState<A> = {
    tag: 'pending',
  };

  constructor(private query: () => Promise<QueryResult<A>>) {
    // noinspection JSIgnoredPromiseFromCall
    this.runQuery();
  }

  listen(fn: ChangeListener<QueryState<A>>, callOnListen: boolean): Disposer {
    return this.listenable.listen(
      fn,
      callOnListen ? () => toChangeVal(this.getValue()) : undefined
    );
  }

  async setAndRunNewQuery(query: () => Promise<QueryResult<A>>) {
    this.query = query;
    return this.reload();
  }

  private async runQuery() {
    this.setState({ tag: 'pending' });
    return this.runQuerySoft();
  }

  private async runQuerySoft() {
    const res = await this.query();
    if (E.isLeft(res)) {
      this.setState({ tag: 'error', value: res.left });
    } else {
      this.setState({ tag: 'success', value: res.right });
    }
    return res;
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

  async reloadSoft() {
    return this.runQuerySoft();
  }

  fmap<B>(
    fn: (a: QueryState<A>) => B,
    equalityCheck: EqualityCheck<B>
  ): ReactiveVal<B> {
    return fmapHelper.fmap(this, fn, equalityCheck);
  }

  fmapStrict<B>(fn: (a: QueryState<A>) => B): ReactiveVal<B> {
    return fmapHelper.fmapStrict(this, fn);
  }

  fmapDeep<B>(fn: (a: QueryState<A>) => B): ReactiveVal<B> {
    return fmapHelper.fmapDeep(this, fn);
  }
}

export function useMkQueryMemo<A>(
  query: () => Promise<QueryResult<A>>,
  deps?: DependencyList
) {
  // we specifically don't want this to be recreated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new Query(query), deps);
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
            <div className={style.message}>
              Error: {renderLineBreaks(queryState.value)}
            </div>
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

import { pipe } from 'fp-ts/function';
import { ChangeListener, Listenable, toChangeVal } from './listener';
import { EqualityCheck } from '../equality';
import { ReactiveVal } from './reactive-interface';
import { Disposer, sequenceDisposers } from '../disposable';
import { O, Option } from '../fp-ts/fp';
import { fmapHelper } from './reactive-fmap';

export class ReactiveSequence<A> implements ReactiveVal<Array<A>> {
  private readonly listenable = new Listenable<[Array<A>, Array<A>]>();

  private value: Option<Array<A>> = O.none;

  constructor(private readonly sources: ReadonlyArray<ReactiveVal<A>>) {}

  listen(fn: ChangeListener<Array<A>>, callOnListen: boolean): Disposer {
    return this.listenable.listenWithSubscription(
      fn,
      this.subscribeToSource.bind(this),
      callOnListen
        ? () => {
            return toChangeVal(this.getValue());
          }
        : undefined
    );
  }

  private subscribeToSource() {
    return sequenceDisposers(
      this.sources.map((it, idx) =>
        it.listen((val) => this.updateValue(val, idx), true)
      )
    );
  }

  private updateValue(val: A, idx: number) {
    const oldVal = pipe(
      this.value,
      O.getOrElse(() => this.sources.map((it) => it.getValue()))
    );
    const newVal = [...oldVal];
    newVal[idx] = val;
    this.value = O.of(newVal);
    this.listenable.notify(newVal, oldVal);
  }

  getValue(): Array<A> {
    this.listenable.assertHasListeners();
    return pipe(
      this.value,
      O.getOrElseW(() => {
        throw new Error('Expected value in ReactiveSequence, got none');
      })
    );
  }

  fmap<B>(
    fn: (a: Array<A>) => B,
    equalityCheck: EqualityCheck<B>
  ): ReactiveVal<B> {
    return fmapHelper.fmap(this, fn, equalityCheck);
  }

  fmapStrict<B>(fn: (a: Array<A>) => B): ReactiveVal<B> {
    return fmapHelper.fmapStrict(this, fn);
  }

  fmapDeep<B>(fn: (a: Array<A>) => B): ReactiveVal<B> {
    return fmapHelper.fmapDeep(this, fn);
  }
}

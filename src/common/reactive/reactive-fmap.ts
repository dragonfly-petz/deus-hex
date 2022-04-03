import { pipe } from 'fp-ts/function';
import { ChangeListener, Listenable, toChangeVal } from './listener';
import {
  deepEqualityCheck,
  EqualityCheck,
  strictEqualityCheck,
} from '../equality';
import { ReactiveVal } from './reactive-interface';
import { Disposer } from '../disposable';
import { O, Option } from '../fp-ts/fp';

class ReactiveFmap<Source, A> implements ReactiveVal<A> {
  private readonly listenable = new Listenable<[A, A]>();

  private value: Option<A> = O.none;

  constructor(
    private readonly source: ReactiveVal<Source>,
    private readonly fn: (a: Source) => A,
    private readonly equalityCheck: EqualityCheck<A>
  ) {}

  listen(fn: ChangeListener<A>, callOnListen: boolean): Disposer {
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
    return this.source.listen(this.updateValue.bind(this), true);
  }

  private updateValue(a: Source, old: Source) {
    const oldVal = pipe(
      this.value,
      O.getOrElse(() => this.fn(old))
    );
    const newVal = this.fn(a);
    this.value = O.of(newVal);
    if (this.equalityCheck(oldVal, newVal)) {
      return;
    }
    this.listenable.notify(newVal, oldVal);
  }

  getValue(): A {
    this.listenable.assertHasListeners();
    return pipe(
      this.value,
      O.getOrElseW(() => {
        throw new Error('Expected value in ReactiveFMap, got none');
      })
    );
  }

  fmap<B>(fn: (a: A) => B, equalityCheck: EqualityCheck<B>): ReactiveVal<B> {
    return fmapHelper.fmap(this, fn, equalityCheck);
  }

  fmapStrict<B>(fn: (a: A) => B): ReactiveVal<B> {
    return fmapHelper.fmapStrict(this, fn);
  }

  fmapDeep<B>(fn: (a: A) => B): ReactiveVal<B> {
    return fmapHelper.fmapDeep(this, fn);
  }
}

export const fmapHelper = {
  fmap<A, B>(
    source: ReactiveVal<A>,
    fn: (a: A) => B,
    equalityCheck: EqualityCheck<B>
  ) {
    return new ReactiveFmap(source, fn, equalityCheck);
  },
  fmapStrict<A, B>(source: ReactiveVal<A>, fn: (a: A) => B) {
    return this.fmap(source, fn, strictEqualityCheck);
  },
  fmapDeep<A, B>(source: ReactiveVal<A>, fn: (a: A) => B) {
    return this.fmap(source, fn, deepEqualityCheck);
  },
};

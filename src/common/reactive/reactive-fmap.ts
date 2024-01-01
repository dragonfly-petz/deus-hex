import { pipe } from 'fp-ts/function';
import { debounce } from 'debounce';
import { ChangeListener, Listenable, toChangeVal } from './listener';
import {
  deepEqualityCheck,
  EqualityCheck,
  strictEqualityCheck,
} from '../equality';
import { ReactiveVal } from './reactive-interface';
import { Disposer } from '../disposable';
import { O, Option } from '../fp-ts/fp';
import { isNotNully } from '../null';

class ReactiveFmap<Source, A> implements ReactiveVal<A> {
  private readonly listenable = new Listenable<[A, A]>();

  private value: Option<A> = O.none;

  constructor(
    private readonly source: ReactiveVal<Source>,
    private readonly fn: (a: Source) => A,
    private readonly equalityCheck: EqualityCheck<A>,
    private readonly debounceInterval?: number
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
    let firstCall = true;
    const updateVal = this.updateValue.bind(this);
    const wrapped = isNotNully(this.debounceInterval)
      ? debounce(updateVal, this.debounceInterval)
      : updateVal;
    return this.source.listen((a, b) => {
      if (firstCall) {
        firstCall = false;
        return updateVal(a, b);
      }
      return wrapped(a, b);
    }, true);
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

  fmapStrict<B>(fn: (a: A) => B, debounceInt?: number): ReactiveVal<B> {
    return fmapHelper.fmapStrict(this, fn, debounceInt);
  }

  fmapDeep<B>(fn: (a: A) => B): ReactiveVal<B> {
    return fmapHelper.fmapDeep(this, fn);
  }
}

export const fmapHelper = {
  fmap<A, B>(
    source: ReactiveVal<A>,
    fn: (a: A) => B,
    equalityCheck: EqualityCheck<B>,
    debounceInt?: number
  ) {
    return new ReactiveFmap(source, fn, equalityCheck, debounceInt);
  },
  fmapStrict<A, B>(
    source: ReactiveVal<A>,
    fn: (a: A) => B,
    debounceInt?: number
  ) {
    return this.fmap(source, fn, strictEqualityCheck, debounceInt);
  },
  fmapDeep<A, B>(source: ReactiveVal<A>, fn: (a: A) => B) {
    return this.fmap(source, fn, deepEqualityCheck);
  },
};
